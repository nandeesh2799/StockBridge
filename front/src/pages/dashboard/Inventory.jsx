import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import API from "../../api/axiosInstance";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Camera,
  Maximize,
  X,
} from "lucide-react";

const Inventory = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const getItemName = (item) => {
    if (!item) return "";
    if (typeof item.name === "object") {
      return item.name[currentLang] || item.name.en || "";
    }
    return item.name || "";
  };

  const getCategoryName = (item) => {
    if (!item) return "";
    if (typeof item.category === "object") {
      return item.category[currentLang] || item.category.en || "";
    }
    return item.category || "";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLang === 'en' ? 'en-IN' : currentLang, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0));
  };

  const { items = [], setItems, sales = [] } = useOutletContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkValues, setBulkValues] = useState({
    priceAdjustmentType: "percent",
    priceAdjustmentValue: "",
    taxPercent: "",
    lowStockThreshold: "",
  });

  const [barcodeMode, setBarcodeMode] = useState(false);
  const [pendingBarcodeLookup, setPendingBarcodeLookup] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const scannerInputRef = useRef(null);
  const videoRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraAutoScanIntervalRef = useRef(null);
  const cameraScanBusyRef = useRef(false);
  const lastCameraCodeRef = useRef({ value: "", at: 0 });
  const imageInputRef = useRef(null);
  const cameraCanvasRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    sellingPrice: "",
    unitType: "piece",
    lowStockThreshold: 5,
    taxPercent: 0,
    hsn: "",
    batchCostPrice: "",
    batchQuantity: "",
    batchExpiryDate: "",
  });

  useEffect(() => {
    if (!barcodeMode || showCameraModal || isDrawerOpen) return;
    const interval = setInterval(() => {
      if (document.activeElement?.tagName !== "INPUT") {
        scannerInputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [barcodeMode, isDrawerOpen, showCameraModal]);

  const normalizeBarcode = (value = "") => value.trim();

  const inferUnit = (quantityText = "") => {
    const text = (quantityText || "").toLowerCase();
    if (text.includes("kg") || text.includes("g")) return "kg";
    if (text.includes("ml") || text.includes("l")) return "litre";
    return "piece";
  };

  const estimatePricesFromLocalInventory = (name = "") => {
    const nameTokens = (name || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .slice(0, 3);

    const candidates = items.filter((entry) => {
      const entryName = (entry.name || "").toLowerCase();
      return (
        nameTokens.length > 0 &&
        nameTokens.some((token) => entryName.includes(token))
      );
    });

    if (!candidates.length) return { sellingPrice: "", purchasePrice: "" };
    const priceList = candidates
      .map((entry) => ({
        selling: Number(entry?.batches?.[0]?.sellingPrice || 0),
        purchase: Number(entry?.batches?.[0]?.purchasePrice || 0),
      }))
      .filter((entry) => entry.selling > 0);

    if (!priceList.length) return { sellingPrice: "", purchasePrice: "" };

    const avgSelling =
      priceList.reduce((sum, entry) => sum + entry.selling, 0) /
      priceList.length;
    const avgPurchase =
      priceList.reduce((sum, entry) => sum + (entry.purchase || 0), 0) /
      priceList.length;

    return {
      sellingPrice: avgSelling > 0 ? Math.round(avgSelling) : "",
      purchasePrice: avgPurchase > 0 ? Math.round(avgPurchase) : "",
    };
  };

  const formDefaultsForBarcodeOnly = (barcode) => ({
    name: "",
    barcode,
    sellingPrice: "",
    unitType: "piece",
    lowStockThreshold: 5,
    taxPercent: 0,
    hsn: "",
    batchCostPrice: "",
    batchQuantity: "",
    batchExpiryDate: "",
  });

  /** Maps backend `/items/barcode-lookup` payload into the inventory drawer. */
  const mapLookupPayloadToForm = (barcode, d) => {
    const name = (d.name || "").trim();
    const quantityText = (d.quantityText || "").trim();
    const prices = estimatePricesFromLocalInventory(name);

    let extractedPrice = "";
    const priceMatch = name.match(/MRP[:\s]*(\d+)/i);
    if (priceMatch) extractedPrice = priceMatch[1];

    const apiPrice = d.suggestedSellingPrice;
    const sellingPrice =
      extractedPrice ||
      (apiPrice != null && apiPrice !== ""
        ? String(apiPrice)
        : prices.sellingPrice !== ""
          ? String(prices.sellingPrice)
          : "");

    const batchCostPrice =
      prices.purchasePrice !== "" ? String(prices.purchasePrice) : "";

    return {
      barcode,
      name,
      sellingPrice,
      unitType: inferUnit(quantityText),
      lowStockThreshold: 5,
      taxPercent: 0,
      hsn: "",
      batchCostPrice,
      batchQuantity: "",
      batchExpiryDate: "",
    };
  };

  async function handleScan(rawBarcode) {
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) return;

    const found = items.find((i) => i.barcode === barcode);
    if (found) {
      toast.info(`Found existing item: ${found.name}`);
      openEditDrawer(found);
      return;
    }

    setPendingBarcodeLookup(true);
    try {
      const res = await API.get(
        `/items/barcode-lookup/${encodeURIComponent(barcode)}`,
      );
      if (res.data?.success && res.data?.data) {
        setFormData(mapLookupPayloadToForm(barcode, res.data.data));
        toast.success(
          res.data.cached
            ? `Product loaded (cache) — ${res.data.source}`
            : `Product found online — ${res.data.source}`,
        );
        setIsDrawerOpen(true);
      } else {
        toast.error(
          "No online match for this barcode. Enter details manually.",
        );
        setFormData(formDefaultsForBarcodeOnly(barcode));
        setIsDrawerOpen(true);
      }
    } catch (error) {
      const data = error.response?.data;
      const message =
        data?.message ||
        "No online match for this barcode. Enter details manually.";
      toast.error(message);
      setFormData(formDefaultsForBarcodeOnly(barcode));
      setIsDrawerOpen(true);
    } finally {
      setPendingBarcodeLookup(false);
    }
  }

  const handleScannerInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleScan(e.target.value);
      e.target.value = "";
    }
  };

  const detectBarcodeFromSource = async (source) => {
    if ("BarcodeDetector" in window) {
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });
      }
      const detected = await barcodeDetectorRef.current.detect(source);
      return detected[0]?.rawValue;
    }
    return null;
  };

  const decodeBarcodeAdvanced = async (sourceCanvas) => {
    try {
      const variant = await createImageBitmap(sourceCanvas);
      return await detectBarcodeFromSource(variant);
    } catch {
      return null;
    }
  };

  const detectBarcodeFromVideoFrame = async () => {
    if (!videoRef.current) return null;
    if (!cameraCanvasRef.current) {
      cameraCanvasRef.current = document.createElement("canvas");
    }
    const canvas = cameraCanvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    return decodeBarcodeAdvanced(canvas);
  };

  const stopCameraStream = () => {
    if (cameraAutoScanIntervalRef.current) {
      clearInterval(cameraAutoScanIntervalRef.current);
      cameraAutoScanIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!showCameraModal || isCameraStarting) return;
    if (!videoRef.current) return;

    cameraAutoScanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || cameraScanBusyRef.current) return;
      if (videoRef.current.readyState < 2) return;

      cameraScanBusyRef.current = true;
      try {
        const value = await detectBarcodeFromVideoFrame();
        if (!value) return;

        const now = Date.now();
        if (
          lastCameraCodeRef.current.value === value &&
          now - lastCameraCodeRef.current.at < 1500
        ) {
          return;
        }
        lastCameraCodeRef.current = { value, at: now };

        closeCameraScan();
        await handleScan(value);
      } catch {
        // Ignore transient detector errors
      } finally {
        cameraScanBusyRef.current = false;
      }
    }, 250);

    return () => {
      if (cameraAutoScanIntervalRef.current) {
        clearInterval(cameraAutoScanIntervalRef.current);
        cameraAutoScanIntervalRef.current = null;
      }
    };
  }, [showCameraModal, isCameraStarting]);

  const startCameraScan = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera access not supported.");
      return;
    }
    setShowCameraModal(true);
    setIsCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setShowCameraModal(false);
      toast.error("Unable to access camera.");
    } finally {
      setIsCameraStarting(false);
    }
  };

  const closeCameraScan = () => {
    stopCameraStream();
    cameraScanBusyRef.current = false;
    setShowCameraModal(false);
  };

  const handleImageFileScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const imageBitmap = await createImageBitmap(file);
      if (!cameraCanvasRef.current) {
        cameraCanvasRef.current = document.createElement("canvas");
      }
      const canvas = cameraCanvasRef.current;
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const context = canvas.getContext("2d");
      context.drawImage(imageBitmap, 0, 0);

      const value = await decodeBarcodeAdvanced(canvas);
      if (!value) {
        toast.error("No barcode detected.");
        return;
      }
      await handleScan(value);
    } catch {
      toast.error("Error scanning image.");
    }
  };

  const getTotalStock = (item) =>
    item.batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;

  const getNearestExpiry = (item) => {
    const batches =
      item.batches
        ?.filter((b) => b.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)) || [];
    return batches[0]?.expiryDate || null;
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const diffDays =
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) return "critical";
    if (diffDays <= 7) return "warning";
    return "safe";
  };

  const isDeadStock = (item) => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const soldRecently = sales.some((sale) =>
      sale.items?.some(
        (saleItem) =>
          saleItem.itemId === item._id && new Date(sale.createdAt) > last30Days,
      ),
    );
    return !soldRecently && getTotalStock(item) > 0;
  };

  let filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  if (sortBy === "low_stock")
    filteredItems.sort((a, b) => getTotalStock(a) - getTotalStock(b));
  else if (sortBy === "high_value")
    filteredItems.sort(
      (a, b) =>
        (b.batches?.[0]?.sellingPrice || 0) -
        (a.batches?.[0]?.sellingPrice || 0),
    );
  else
    filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingItemId(null);
    setIsDrawerOpen(false);
    setFormData({
      name: "",
      barcode: "",
      sellingPrice: "",
      unitType: "piece",
      lowStockThreshold: 5,
      taxPercent: 0,
      hsn: "",
      batchCostPrice: "",
      batchQuantity: "",
      batchExpiryDate: "",
    });
  };

  const openEditDrawer = (item) => {
    setEditingItemId(item._id);
    const mainBatch = item.batches?.[0] || {};
    setFormData({
      name: item.name,
      barcode: item.barcode || "",
      sellingPrice: mainBatch.sellingPrice || "",
      unitType: item.unit || "piece",
      lowStockThreshold: item.alertQuantity || 5,
      taxPercent: item.taxPercent || 0,
      hsn: item.hsn || "",
      batchCostPrice: mainBatch.purchasePrice || "",
      batchQuantity: mainBatch.quantity || "",
      batchExpiryDate: mainBatch.expiryDate
        ? mainBatch.expiryDate.split("T")[0]
        : "",
    });
    setIsDrawerOpen(true);
  };

  const handleSaveItem = async () => {
    if (
      !formData.name ||
      !formData.barcode ||
      !formData.sellingPrice ||
      !formData.batchCostPrice ||
      !formData.batchQuantity
    ) {
      toast.error(t("validation.missingRequiredFields"));
      return;
    }
    setIsSubmitting(true);
    const payload = {
      name: typeof formData.name === 'string' ? { [currentLang]: formData.name } : formData.name,
      barcode: formData.barcode.trim(),
      unit: formData.unitType,
      alertQuantity: Number(formData.lowStockThreshold),
      taxPercent: Number(formData.taxPercent),
      hsn: formData.hsn,
      batches: [
        {
          purchasePrice: Number(formData.batchCostPrice),
          sellingPrice: Number(formData.sellingPrice),
          quantity: Number(formData.batchQuantity),
          expiryDate: formData.batchExpiryDate
            ? new Date(formData.batchExpiryDate)
            : null,
        },
      ],
    };
    try {
      if (editingItemId) {
        const res = await API.put(`/items/${editingItemId}`, payload);
        setItems((prev) =>
          prev.map((i) => (i._id === editingItemId ? res.data.data : i)),
        );
        toast.success(t("toast.itemUpdated"));
      } else {
        const res = await API.post("/items", payload);
        setItems((prev) => [res.data.data, ...prev]);
        toast.success(t("toast.itemAdded"));
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || t("common.errorSaving"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/items/${deleteId}`);
      setItems((prev) => prev.filter((item) => item._id !== deleteId));
      toast.success(t("common.itemDeleted"));
    } catch {
      toast.error(t("common.errorDeleting"));
    } finally {
      setDeleteId(null);
    }
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const resetBulkPanel = () => {
    setShowBulkPanel(false);
    setSelectedItemIds([]);
    setBulkValues({
      priceAdjustmentType: "percent",
      priceAdjustmentValue: "",
      taxPercent: "",
      lowStockThreshold: "",
    });
  };

  const handleBulkApply = async () => {
    if (!selectedItemIds.length) {
      toast.error(t("toast.bulkUpdateSelectAtLeastOne"));
      return;
    }
    const hasAnyUpdate =
      bulkValues.priceAdjustmentValue !== "" ||
      bulkValues.taxPercent !== "" ||
      bulkValues.lowStockThreshold !== "";
    if (!hasAnyUpdate) {
      toast.error(t("toast.bulkUpdateNoChange"));
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedEntries = await Promise.all(
        selectedItemIds.map(async (itemId) => {
          const item = items.find((entry) => entry._id === itemId);
          if (!item) return null;

          const adjustment = Number(bulkValues.priceAdjustmentValue || 0);
          const updatedBatches =
            item.batches?.map((batch) => {
              const base = Number(batch.sellingPrice || 0);
              let nextSellingPrice = base;
              if (bulkValues.priceAdjustmentValue !== "") {
                nextSellingPrice =
                  bulkValues.priceAdjustmentType === "percent"
                    ? base + (base * adjustment) / 100
                    : base + adjustment;
              }
              return {
                ...batch,
                sellingPrice: Math.max(0, Number(nextSellingPrice.toFixed(2))),
              };
            }) || [];

          const payload = {
            name: item.name,
            unit: item.unit,
            hsn: item.hsn || "",
            taxPercent:
              bulkValues.taxPercent !== ""
                ? Number(bulkValues.taxPercent)
                : Number(item.taxPercent || 0),
            alertQuantity:
              bulkValues.lowStockThreshold !== ""
                ? Number(bulkValues.lowStockThreshold)
                : Number(item.alertQuantity || 0),
            batches: updatedBatches,
          };

          const res = await API.put(`/items/${itemId}`, payload);
          return res.data.data;
        }),
      );

      const updatedMap = new Map(
        updatedEntries.filter(Boolean).map((item) => [item._id, item]),
      );
      setItems((prev) =>
        prev.map((item) => (updatedMap.has(item._id) ? updatedMap.get(item._id) : item)),
      );
      toast.success(t("toast.bulkUpdateSuccess", { count: updatedMap.size }));
      resetBulkPanel();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-white space-y-6 bg-transparent min-h-dvh pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t("inventory.title")}</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            {t("inventory.manageInventoryDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              setBarcodeMode(!barcodeMode);
              toast.info(
                barcodeMode ? t("inventory.scannerOff") : t("inventory.scannerOn") + " — scan any barcode!",
              );
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${barcodeMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-transparent"}`}
          >
            <Zap size={16} /> {barcodeMode ? t("inventory.scannerOn") : t("inventory.enableScanner")}
          </button>
          <button
            onClick={() => setShowBulkPanel(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors"
          >
            <UploadCloud size={16} />{" "}
            <span className="hidden sm:inline">{t("inventory.bulkUpdate")}</span>
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} /> {t("inventory.addItem")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors text-white shadow-sm"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-48 appearance-none pl-4 pr-10 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-bold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="recent">{t("inventory.recentlyAdded")}</option>
              <option value="low_stock">{t("inventory.lowStockFirst")}</option>
              <option value="high_value">{t("inventory.highValueFirst")}</option>
            </select>
            <ArrowUpDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={14}
            />
          </div>
        </div>

        {barcodeMode && (
          <div className="rounded-xl p-4 bg-[#111113] border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">
              Background Scanner Active
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={scannerInputRef}
                type="text"
                onKeyDown={handleScannerInputKeyDown}
                onBlur={() => {
                  if (!isDrawerOpen && !showCameraModal) {
                    scannerInputRef.current?.focus();
                  }
                }}
                placeholder="Scan barcode and press Enter"
                className="flex-1 px-4 py-2 bg-[#09090b] border border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={startCameraScan}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-700"
                >
                  <Camera size={14} /> Camera
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-700"
                >
                  <Maximize size={14} /> From Image
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileScan}
                  className="hidden"
                />
              </div>
            </div>
            {pendingBarcodeLookup && (
              <p className="mt-2 text-xs text-amber-400 font-bold animate-pulse">
                Fetching product details...
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => {
          const stock = getTotalStock(item);
          const nearestExpiry = getNearestExpiry(item);
          const expiryStatus = getExpiryStatus(nearestExpiry);
          const dead = isDeadStock(item);
          const price = item.batches?.[0]?.sellingPrice || 0;
          let stockColor =
            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
          let StockIcon = CheckCircle2;
          if (stock === 0) {
            stockColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
            StockIcon = AlertTriangle;
          } else if (stock <= item.alertQuantity) {
            stockColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
            StockIcon = AlertCircle;
          }

          return (
            <div
              key={item._id}
              className="p-4 sm:p-5 rounded-2xl bg-[#111113] border border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white truncate pr-2">
                    {getItemName(item)}
                  </h3>
                  <p className="font-black text-lg text-indigo-400">₹{price}</p>
                </div>
                <p className="text-xs text-slate-400 font-medium mb-3">
                  GST: {item.taxPercent}% | HSN: {item.hsn || "-"}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-md border ${stockColor}`}
                  >
                    <StockIcon size={12} /> Stock: {stock} {item.unit}
                  </span>
                  {expiryStatus === "critical" && (
                    <span className="px-2 py-1 text-[10px] font-bold rounded bg-red-600 text-white shadow-sm">
                      Expiring Soon
                    </span>
                  )}
                  {dead && (
                    <span className="px-2 py-1 text-[10px] font-bold rounded bg-slate-600 text-white shadow-sm">
                      Dead Stock
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-end justify-between border-t border-slate-800/60 pt-4 mt-auto">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Clock size={12} /> Updated:{" "}
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString(i18n.language === 'en' ? 'en-IN' : i18n.language)
                    : "Today"}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => openEditDrawer(item)}
                    className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(item._id)}
                    className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isDrawerOpen && (
        <>
          <div
            onClick={resetForm}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-100 bg-[#111113] border-l border-slate-800 p-6 pb-24 z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black text-white mb-6">
              {editingItemId ? t("inventory.editItem") : t("inventory.addProduct")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block tracking-wider">
                  {t("inventory.itemName")}
                </label>
                <input
                  name="name"
                  placeholder="e.g. Maggi"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-400 uppercase block tracking-wider">
                    {t("inventory.barcode")}
                  </label>
                  {formData.barcode && (
                    <a
                      href={`https://www.google.com/search?q=${formData.barcode}+price+india`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 font-bold hover:underline"
                    >
                      {t("inventory.searchPriceOnline")}
                    </a>
                  )}
                </div>
                <input
                  name="barcode"
                  placeholder={t("inventory.scanBarcodePlaceholder")}
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {t("inventory.price")}
                  </label>
                  <input
                    name="sellingPrice"
                    type="number"
                    placeholder="₹ 0"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {t("inventory.unitType")}
                  </label>
                  <select
                    name="unitType"
                    value={formData.unitType}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="piece">{t("inventory.piece")}</option>
                    <option value="kg">{t("inventory.kg")}</option>
                    <option value="litre">{t("inventory.litre")}</option>
                    <option value="box">{t("inventory.box")}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {t("inventory.alertQuantity")}
                  </label>
                  <input
                    name="lowStockThreshold"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {t("inventory.taxPercent")}
                  </label>
                  <select
                    name="taxPercent"
                    value={formData.taxPercent}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  {t("inventory.hsnCode")}
                </label>
                <input
                  name="hsn"
                  placeholder={t("inventory.optional")}
                  value={formData.hsn}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-4 mt-2">
                <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-widest">
                  {t("inventory.initialBatchInfo")}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                      {t("inventory.purchasePrice")}
                    </label>
                    <input
                      name="batchCostPrice"
                      type="number"
                      placeholder="₹ 0"
                      value={formData.batchCostPrice}
                      onChange={handleChange}
                      className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                      {t("inventory.currentQuantity")}
                    </label>
                    <input
                      name="batchQuantity"
                      type="number"
                      placeholder="0"
                      value={formData.batchQuantity}
                      onChange={handleChange}
                      className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {t("inventory.expiryDate")}
                  </label>
                  <input
                    name="batchExpiryDate"
                    type="date"
                    value={formData.batchExpiryDate}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  onClick={resetForm}
                  className="flex-1 py-3.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
                >
                  {isSubmitting ? t("settings.saving") : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          />
          <div className="bg-[#111113] border border-slate-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h3 className="text-xl font-black text-white mb-2">{t("inventory.deleteItem")}</h3>
            <p className="text-slate-400 text-sm">
              Are you sure you want to remove this item? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={resetBulkPanel}
          />
          <div className="relative w-full max-w-xl bg-[#111113] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
            <div>
              <h3 className="text-xl font-black text-white">{t("inventory.bulkUpdate")}</h3>
              <p className="text-sm text-slate-400 mt-1">
                Select items below, then apply common updates in one action.
              </p>
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800">
              {filteredItems.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">{t("common.noData")}</p>
              ) : (
                filteredItems.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/30"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{getItemName(item)}</p>
                      <p className="text-xs text-slate-500">
                        Stock: {getTotalStock(item)} {item.unit}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item._id)}
                      onChange={() => toggleSelectItem(item._id)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">
                  Price Change Mode
                </label>
                <select
                  value={bulkValues.priceAdjustmentType}
                  onChange={(e) =>
                    setBulkValues((prev) => ({
                      ...prev,
                      priceAdjustmentType: e.target.value,
                    }))
                  }
                  className="w-full p-3 rounded-xl bg-[#09090b] border border-slate-700 text-white"
                >
                  <option value="percent">{t("inventory.percent")}</option>
                  <option value="fixed">{t("inventory.fixedAmount")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">
                  Price Change Value
                </label>
                <input
                  type="number"
                  value={bulkValues.priceAdjustmentValue}
                  onChange={(e) =>
                    setBulkValues((prev) => ({
                      ...prev,
                      priceAdjustmentValue: e.target.value,
                    }))
                  }
                  placeholder="e.g. 5 or -2"
                  className="w-full p-3 rounded-xl bg-[#09090b] border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">
                  Tax %
                </label>
                <input
                  type="number"
                  value={bulkValues.taxPercent}
                  onChange={(e) =>
                    setBulkValues((prev) => ({ ...prev, taxPercent: e.target.value }))
                  }
                  placeholder="Keep empty to skip"
                  className="w-full p-3 rounded-xl bg-[#09090b] border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">
                  Alert Quantity
                </label>
                <input
                  type="number"
                  value={bulkValues.lowStockThreshold}
                  onChange={(e) =>
                    setBulkValues((prev) => ({
                      ...prev,
                      lowStockThreshold: e.target.value,
                    }))
                  }
                  placeholder="Keep empty to skip"
                  className="w-full p-3 rounded-xl bg-[#09090b] border border-slate-700 text-white"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Selected items:{" "}
              <span className="text-indigo-400 font-bold">{selectedItemIds.length}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={resetBulkPanel}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkApply}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? "Applying..." : "Apply Bulk Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-xl aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {isCameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold animate-pulse">
                  Starting camera...
                </p>
              </div>
            )}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <div className="absolute inset-0 pointer-events-none border-[2px] border-indigo-500/30 m-8 rounded-2xl flex items-center justify-center">
              <div className="w-full h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-scan" />
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={closeCameraScan}
                className="p-3 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-sm">
              <p className="text-[10px] font-black text-white uppercase tracking-widest text-center">
                Align barcode within frame
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
