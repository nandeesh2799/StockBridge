import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, Search, Receipt, Zap } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { CloudUpload } from "lucide-react";
import API from "../../api/axiosInstance";
import { savePendingSale, getPendingSales } from "../../utils/offlineSync";

const POS = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || "en";

  const getItemName = (item) => {
    if (!item) return "";
    if (typeof item.name === "object") {
      return item.name[currentLang] || item.name.en || "";
    }
    return item.name || "";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLang === 'en' ? 'en-IN' : currentLang, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const {
    items,
    sales = [],
    setSales,
    shopProfile = {},
    customers,
    setCustomers,
    setItems,
  } = useOutletContext();

  const SHOP_NAME = shopProfile.shopName || shopProfile.name || "StockBridge";
  const UPI_ID = shopProfile.upiId || "";

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payments, setPayments] = useState({ cash: "", upi: "", credit: "" });
  const [isUpiAuto, setIsUpiAuto] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [showPosHistory, setShowPosHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [lastScannedItemId, setLastScannedItemId] = useState("");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isSavingScannedItem, setIsSavingScannedItem] = useState(false);
  const [pendingBarcodeLookup, setPendingBarcodeLookup] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingSales().length);
  const [isAutoFillingProduct, setIsAutoFillingProduct] = useState(false);

  useEffect(() => {
    const updateSyncCount = () => {
      setPendingSyncCount(getPendingSales().length);
    };
    window.addEventListener("online", updateSyncCount);
    window.addEventListener("salesSynced", updateSyncCount);
    return () => {
      window.removeEventListener("online", updateSyncCount);
      window.removeEventListener("salesSynced", updateSyncCount);
    };
  }, []);
  const [autoFillSource, setAutoFillSource] = useState("");
  const [addItemForm, setAddItemForm] = useState({
    name: "",
    barcode: "",
    category: "",
    unit: "piece",
    taxPercent: "0",
    hsn: "",
    sellingPrice: "",
    purchasePrice: "",
    quantity: "",
  });
  const searchRef = useRef(null);
  const scannerInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraAutoScanIntervalRef = useRef(null);
  const cameraScanBusyRef = useRef(false);
  const lastCameraCodeRef = useRef({ value: "", at: 0 });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!barcodeMode || showCameraModal || showAddItemModal) return;
    scannerInputRef.current?.focus();
  }, [barcodeMode, showAddItemModal, showCameraModal]);

  useEffect(() => {
    return () => {
      if (cameraAutoScanIntervalRef.current) {
        clearInterval(cameraAutoScanIntervalRef.current);
        cameraAutoScanIntervalRef.current = null;
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  const addToCart = (product) => {
    const stock = product.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
    const existing = cart.find((c) => c.itemId === product._id);
    const currentQty = existing?.quantity || 0;
    const prodName = getItemName(product);
    if (currentQty >= stock)
      return toast.error(`${t("validation.stockUnavailable")}: ${stock} units of ${prodName}`);
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.itemId === product._id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      const availableBatch = product.batches?.find((b) => b.quantity > 0) || product.batches?.[0] || {};
      setCart((prev) => [
        ...prev,
        {
          itemId: product._id,
          batchId: availableBatch._id,
          name: prodName,
          sellingPrice: availableBatch.sellingPrice || 0,
          purchasePrice: availableBatch.purchasePrice || 0,
          quantity: 1,
        },
      ]);
    }
  };

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.06;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.08);
      oscillator.onended = () => ctx.close();
    } catch {
      // Silent fallback if browser blocks autoplay/audio context.
    }
  };

  const normalizeBarcode = (value = "") => value.trim();

  const inferUnit = (quantityText = "") => {
    const text = (quantityText || "").toLowerCase();
    if (text.includes("kg") || text.includes("g")) return "kg";
    if (text.includes("ml") || text.includes("l")) return "litre";
    return "piece";
  };

  const estimatePricesFromLocalInventory = (name = "", category = "") => {
    const categoryLower = (category || "").toLowerCase();
    const nameTokens = (name || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .slice(0, 3);

    const candidates = items.filter((entry) => {
      const entryName = getItemName(entry).toLowerCase();
      const entryCategory = (typeof entry.category === 'string' ? entry.category : entry.category?.en || "").toLowerCase();
      const hasCategoryMatch = categoryLower && entryCategory.includes(categoryLower);
      const hasNameMatch =
        nameTokens.length > 0 &&
        nameTokens.some((token) => entryName.includes(token));
      return hasCategoryMatch || hasNameMatch;
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
      priceList.reduce((sum, entry) => sum + entry.selling, 0) / priceList.length;
    const avgPurchase =
      priceList.reduce((sum, entry) => sum + (entry.purchase || 0), 0) /
      priceList.length;

    return {
      sellingPrice: avgSelling > 0 ? avgSelling.toFixed(2) : "",
      purchasePrice: avgPurchase > 0 ? avgPurchase.toFixed(2) : "",
    };
  };

  /** Maps backend `/items/barcode-lookup` payload into the quick-add form. */
  const mapLookupPayloadToAddItemForm = (barcode, d) => {
    const name = (d.name || "").trim();
    const quantityText = (d.quantityText || "").trim();
    const category = (d.category || "").trim();
    const priceHints = estimatePricesFromLocalInventory(name, category);

    let extractedPrice = "";
    const priceMatch = name.match(/MRP[:\s]*(\d+)/i);
    if (priceMatch) extractedPrice = priceMatch[1];

    const apiPrice = d.suggestedSellingPrice;
    const sellingPrice =
      extractedPrice ||
      (apiPrice != null && apiPrice !== ""
        ? String(apiPrice)
        : priceHints.sellingPrice !== ""
          ? String(priceHints.sellingPrice)
          : "");

    const purchasePrice =
      priceHints.purchasePrice !== "" ? String(priceHints.purchasePrice) : "";

    return {
      barcode,
      name,
      category,
      unit: inferUnit(quantityText),
      taxPercent: "0",
      hsn: "",
      sellingPrice,
      purchasePrice,
    };
  };

  const mergeAutoFillIntoForm = (barcode, details = {}) => {
    setAddItemForm((prev) => {
      if (prev.barcode !== barcode) return prev;
      return {
        ...prev,
        name: prev.name || details.name || "",
        category: prev.category || details.category || "",
        unit: prev.unit || details.unit || "piece",
        taxPercent: prev.taxPercent || details.taxPercent || "0",
        hsn: prev.hsn || details.hsn || "",
        sellingPrice: prev.sellingPrice || details.sellingPrice || "",
        purchasePrice: prev.purchasePrice || details.purchasePrice || "",
      };
    });
  };

  const getZXingReader = async () => {
    if (zxingReaderRef.current) return zxingReaderRef.current;
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    zxingReaderRef.current = reader;
    return reader;
  };

  const fetchBarcodeLookup = async (barcode) => {
    try {
      const res = await API.get(
        `/items/barcode-lookup/${encodeURIComponent(barcode)}`,
      );
      if (res.data?.success && res.data?.data) {
        return {
          ok: true,
          data: res.data.data,
          source: res.data.source,
          cached: !!res.data.cached,
        };
      }
      return {
        ok: false,
        message: res.data?.message,
      };
    } catch (e) {
      const d = e.response?.data;
      return {
        ok: false,
        message: d?.message,
      };
    }
  };

  const openAddItemModal = ({
    name = "",
    barcode = "",
    category = "",
    unit = "piece",
    taxPercent = "0",
    hsn = "",
    sellingPrice = "",
    purchasePrice = "",
  }) => {
    setAddItemForm({
      name,
      barcode,
      category,
      unit,
      taxPercent,
      hsn,
      sellingPrice,
      purchasePrice,
      quantity: "",
    });
    setAutoFillSource("");
    setShowAddItemModal(true);
  };

  async function handleScan(rawBarcode) {
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) return;

    const found = items.find((i) => i.barcode === barcode);
    if (found) {
      addToCart(found);
      setLastScannedItemId(found._id);
      playBeep();
      toast.success(t("toast.itemAdded"));
      return;
    }

    toast.info(t("toast.newProductDetected"));
    setPendingBarcodeLookup(true);

    try {
      const lookup = await fetchBarcodeLookup(barcode);
      if (lookup.ok) {
        openAddItemModal(mapLookupPayloadToAddItemForm(barcode, lookup.data));
        setAutoFillSource(
          lookup.cached ? `${lookup.source} (cache)` : lookup.source,
        );
      } else {
        openAddItemModal({ barcode });
        const msg =
          lookup.message ||
          t("validation.noBarcodeDetected");
        toast.error(msg);
      }
    } catch {
      openAddItemModal({ barcode });
      toast.error(t("validation.lookupError"));
    } finally {
      setPendingBarcodeLookup(false);
    }
  }

  const handleScannerInputKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = e.currentTarget.value;
    e.currentTarget.value = "";
    await handleScan(value);
  };

  const handleSaveScannedItem = async (e) => {
    e.preventDefault();
    if (!addItemForm.name || !addItemForm.sellingPrice || !addItemForm.quantity) {
      toast.error(t("validation.itemDetailsRequired"));
      return;
    }
    if (!addItemForm.barcode) {
      toast.error(t("validation.barcodeRequired"));
      return;
    }

    setIsSavingScannedItem(true);
    try {
      const payload = {
        name: { [currentLang]: addItemForm.name.trim() },
        barcode: addItemForm.barcode.trim(),
        category: { [currentLang]: addItemForm.category.trim() || "General" },
        unit: addItemForm.unit || "piece",
        alertQuantity: 5,
        taxPercent: Number(addItemForm.taxPercent || 0),
        hsn: addItemForm.hsn.trim(),
        batches: [
          {
            purchasePrice: Number(addItemForm.purchasePrice || 0),
            sellingPrice: Number(addItemForm.sellingPrice),
            quantity: Number(addItemForm.quantity),
            expiryDate: null,
          },
        ],
      };

      const res = await API.post("/items", payload);
      const savedItem = res.data?.data;
      if (!savedItem?._id) throw new Error("Failed to save item");

      setItems((prev) => {
        const exists = prev.some((i) => i._id === savedItem._id);
        return exists
          ? prev.map((i) => (i._id === savedItem._id ? savedItem : i))
          : [...prev, savedItem];
      });

      addToCart(savedItem);
      setLastScannedItemId(savedItem._id);
      playBeep();
      toast.success(t("toast.itemAdded"));
      setShowAddItemModal(false);
      setAddItemForm({
        name: "",
        barcode: "",
        category: "",
        unit: "piece",
        taxPercent: "0",
        hsn: "",
        sellingPrice: "",
        purchasePrice: "",
        quantity: "",
      });
      setAutoFillSource("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save item");
    } finally {
      setIsSavingScannedItem(false);
      scannerInputRef.current?.focus();
    }
  };

  const detectBarcodeFromSource = async (source) => {
    if ("BarcodeDetector" in window) {
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "itf",
            "codabar",
            "qr_code",
          ],
        });
      }
      const detected = await barcodeDetectorRef.current.detect(source);
      const value = detected?.[0]?.rawValue?.trim() || "";
      if (value) return value;
    }
    return "";
  };

  const decodeWithZXing = async (sourceCanvas) => {
    try {
      const reader = await getZXingReader();
      const result = await reader.decodeFromCanvas(sourceCanvas);
      return result?.getText?.()?.trim() || "";
    } catch {
      return "";
    }
  };

  const createImageVariants = (sourceCanvas) => {
    const variants = [sourceCanvas];
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) return variants;

    const cropCanvas = document.createElement("canvas");
    const cropW = Math.floor(width * 0.75);
    const cropH = Math.floor(height * 0.4);
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (cropCtx) {
      cropCtx.drawImage(
        sourceCanvas,
        Math.floor((width - cropW) / 2),
        Math.floor((height - cropH) / 2),
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH,
      );
      variants.push(cropCanvas);
    }

    const highContrastCanvas = document.createElement("canvas");
    highContrastCanvas.width = width;
    highContrastCanvas.height = height;
    const contrastCtx = highContrastCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (contrastCtx) {
      contrastCtx.drawImage(sourceCanvas, 0, 0, width, height);
      const image = contrastCtx.getImageData(0, 0, width, height);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const value = gray > 138 ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }
      contrastCtx.putImageData(image, 0, 0);
      variants.push(highContrastCanvas);
    }

    return variants;
  };

  const decodeBarcodeAdvanced = async (sourceCanvas) => {
    const variants = createImageVariants(sourceCanvas);
    for (const variant of variants) {
      const withDetector = await detectBarcodeFromSource(variant);
      if (withDetector) return withDetector;
      const withZXing = await decodeWithZXing(variant);
      if (withZXing) return withZXing;
    }
    return "";
  };

  const detectBarcodeFromVideoFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return "";

    if (!cameraCanvasRef.current) {
      cameraCanvasRef.current = document.createElement("canvas");
    }
    const canvas = cameraCanvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "";
    context.drawImage(video, 0, 0, width, height);
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
        // Ignore transient detector errors and continue scanning.
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
      toast.error("Camera access is not supported in this browser.");
      return;
    }

    setShowCameraModal(true);
    setIsCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      setShowCameraModal(false);
      toast.error(
        error?.name === "NotAllowedError"
          ? "Camera permission denied."
          : "Unable to open laptop camera.",
      );
    } finally {
      setIsCameraStarting(false);
    }
  };

  const closeCameraScan = () => {
    stopCameraStream();
    cameraScanBusyRef.current = false;
    setShowCameraModal(false);
    scannerInputRef.current?.focus();
  };

  const handleScanFromCameraFrame = async () => {
    if (!videoRef.current) return;
    try {
      const value = await detectBarcodeFromVideoFrame();
      if (!value) {
        toast.error(t("validation.missingRequiredFields")); // Or a more specific one if I had it
        return;
      }
      closeCameraScan();
      await handleScan(value);
    } catch {
      toast.error(t("validation.uploadError"));
    }
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
      if (!context) {
        toast.error("Unable to process selected image.");
        return;
      }
      context.drawImage(imageBitmap, 0, 0);

      const value = await decodeBarcodeAdvanced(canvas);
      if (!value) {
        toast.error("No barcode detected. Try a clearer image.");
        return;
      }
      await handleScan(value);
    } catch {
      toast.error("Unable to read barcode from selected image.");
    }
  };

  useEffect(() => {
    if (!showAddItemModal || !addItemForm.barcode) return;
    if (addItemForm.name && addItemForm.category) return;

    let cancelled = false;
    const barcode = addItemForm.barcode;

    const hydrateFromBarcode = async () => {
      setIsAutoFillingProduct(true);
      try {
        const lookup = await fetchBarcodeLookup(barcode);
        if (!lookup.ok || cancelled) return;
        const mapped = mapLookupPayloadToAddItemForm(barcode, lookup.data);
        mergeAutoFillIntoForm(barcode, mapped);
        setAutoFillSource(
          lookup.cached ? `${lookup.source} (cache)` : lookup.source,
        );
      } catch {
        // Keep manual entry flow if lookup fails.
      } finally {
        if (!cancelled) setIsAutoFillingProduct(false);
      }
    };

    hydrateFromBarcode();
    return () => {
      cancelled = true;
    };
  }, [showAddItemModal, addItemForm.barcode]);

  const increaseQty = (id) => {
    const item = items.find((i) => i._id === id);
    const stock = item?.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
    const cartItem = cart.find((c) => c.itemId === id);
    if (cartItem?.quantity >= stock) return toast.error(t("validation.stockUnavailable"));
    setCart((prev) =>
      prev.map((c) =>
        c.itemId === id ? { ...c, quantity: c.quantity + 1 } : c,
      ),
    );
  };

  const decreaseQty = (id) =>
    setCart((prev) =>
      prev
        .map((c) => (c.itemId === id ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0),
    );

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((c) => c.itemId !== id));

  const grandTotal = cart.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );
  useEffect(() => {
    if (!isUpiAuto) return;
    const cash = Number(payments.cash || 0);
    const credit = Number(payments.credit || 0);
    const remainingForUpi = Math.max(0, grandTotal - cash - credit);
    setPayments((prev) => ({
      ...prev,
      upi: remainingForUpi > 0 ? remainingForUpi.toFixed(2) : "",
    }));
  }, [grandTotal, payments.cash, payments.credit, isUpiAuto]);

  const upiAmount = Number(payments.upi || 0);
  const upiLink =
    upiAmount > 0 && UPI_ID
      ? `upi://pay?pa=${UPI_ID}&pn=${SHOP_NAME}&am=${upiAmount}&cu=INR`
      : null;

  const handleCheckoutClick = () => {
    if (cart.length === 0) return toast.error(t("billing.noItemsInCart"));
    const cash = Number(payments.cash || 0);
    const upi = Number(payments.upi || 0);
    const credit = Number(payments.credit || 0);
    if (
      Math.round((cash + upi + credit) * 100) !== Math.round(grandTotal * 100)
    )
      return toast.error(`${t("billing.insufficientPayment")} (${formatCurrency(grandTotal)})`);
    if (credit > 0 && customerPhone.trim().length < 10)
      return toast.error(t("validation.invalidPhone"));
    setShowConfirmModal(true);
  };

  const completeSale = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const cash = Number(payments.cash || 0);
    const upi = Number(payments.upi || 0);
    const credit = Number(payments.credit || 0);
    let customerId = null;

    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
      const existing = customers.find((c) => c.phone.includes(cleanPhone));
      if (existing) {
        customerId = existing._id;
      } else {
        try {
          const newCustRes = await API.post("/customers", {
            name: `Walk-in ${cleanPhone}`,
            phone: cleanPhone,
          });
          customerId = newCustRes.data.data._id;
          setCustomers((prev) => [...prev, newCustRes.data.data]);
        } catch (err) {
          if (err.response?.status === 400) {
            const custRes = await API.get("/customers");
            const found = custRes.data.data.find((c) =>
              c.phone.includes(cleanPhone),
            );
            if (found) customerId = found._id;
          } else {
            toast.error(t("common.error"));
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    const totalPurchasePrice = cart.reduce(
      (sum, item) => sum + item.purchasePrice * item.quantity,
      0,
    );
    const salePayload = {
      shop: shopProfile._id,
      items: cart.map((i) => ({
        itemId: i.itemId,
        batchId: i.batchId,
        name: i.name,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice,
        purchasePrice: i.purchasePrice,
      })),
      totalAmount: grandTotal,
      totalPurchasePrice,
      paymentSplit: { cash, upi, credit },
      customer: customerId,
    };

    try {
      const res = await API.post("/sales", salePayload);
      const savedSale = res.data.data;
      setSales((prev) => [...prev, savedSale]);
      handleAfterSale(savedSale, credit, customerId);
    } catch (error) {
      if (!error.response || error.code === "ERR_NETWORK") {
        const offlineSale = savePendingSale(salePayload);
        setSales((prev) => [...prev, offlineSale]);
        handleAfterSale(offlineSale, credit, customerId);
        toast.warning(t("toast.savedOffline"));
      } else {
        toast.error(error.response?.data?.message || t("toast.error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAfterSale = (savedSale, credit, customerId) => {
    const cash = Number(payments.cash || 0);
    const upi = Number(payments.upi || 0);

    if (credit > 0 && customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c._id === customerId
            ? { ...c, totalCredit: (c.totalCredit || 0) + credit }
            : c,
        ),
      );
    }
    setItems((prev) =>
      prev.map((item) => {
        const cartItem = cart.find((c) => c.itemId === item._id);
        if (!cartItem) return item;

        let remaining = cartItem.quantity;
        let updatedBatches = item.batches.map((b) => {
          if (b._id === cartItem.batchId) {
            const deduct = Math.min(b.quantity, remaining);
            remaining -= deduct;
            return { ...b, quantity: Math.max(0, b.quantity - deduct) };
          }
          return b;
        });

        if (remaining > 0) {
          updatedBatches = updatedBatches.map((b) => {
            if (remaining <= 0 || b.quantity <= 0) return b;
            const deduct = Math.min(b.quantity, remaining);
            remaining -= deduct;
            return { ...b, quantity: Math.max(0, b.quantity - deduct) };
          });
        }

        return {
          ...item,
          batches: updatedBatches,
        };
      }),
    );
    let waUrl = "";
    if (customerPhone && customerPhone.trim().length >= 10) {
      const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
      const now = new Date();
      const dateStr = now.toLocaleDateString(currentLang === 'en' ? 'en-IN' : currentLang, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString(currentLang === 'en' ? 'en-IN' : currentLang, {
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemDetails = cart
        .map(
          (i) =>
            `${i.name.toUpperCase()}\nQty: ${i.quantity} | Rate: ${i.sellingPrice.toFixed(2)} | Total: ${(i.quantity * i.sellingPrice).toFixed(2)}`,
        )
        .join("\n\n");

      const paymentSplitStr = [
        cash > 0 ? `- ${t("billing.cash")} : ${cash.toFixed(2)}` : "",
        upi > 0 ? `- ${t("billing.upi")} : ${upi.toFixed(2)}` : "",
        credit > 0 ? `- ${t("billing.credit")} : ${credit.toFixed(2)}` : "",
      ].filter(Boolean).join("\n");

      const message =
        t("whatsapp.invoiceHeader", { shopName: SHOP_NAME.toUpperCase() }) +
        t("whatsapp.invoiceDetails", { invoiceNo: savedSale.invoiceNumber, date: dateStr, time: timeStr, items: itemDetails }) +
        t("whatsapp.invoiceSummary", { subTotal: grandTotal.toFixed(2), total: grandTotal.toFixed(2) }) +
        t("whatsapp.paymentDetails", { paymentSplit: paymentSplitStr }) +
        t("whatsapp.footer", { shopName: SHOP_NAME });

      waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`;
    }
    setCart([]);
    setPayments({ cash: "", upi: "", credit: "" });
    setIsUpiAuto(true);
    setCustomerPhone("");
    setShowConfirmModal(false);
    
    if (!savedSale.offline) {
      toast.success(t("toast.saleSuccess"));
      navigate(`/dashboard/invoice/${savedSale._id}`);
    } else {
      // In offline mode, maybe just show a success message but stay on POS
      // or show a preview of the offline receipt.
      // For now, let's just toast and stay.
    }

    if (waUrl) {
      setTimeout(() => {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }, 150);
    }
  };

  const availableItems = items.filter((item) => {
    const stock = item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
    const prodName = getItemName(item);
    return stock > 0 && prodName.toLowerCase().includes(search.toLowerCase());
  });
  const salesHistory = [...sales].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const filteredSalesHistory = salesHistory.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    if (historyFilter === "today") return saleDate >= startOfToday;
    if (historyFilter === "week") return saleDate >= startOfWeek;
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-white min-h-screen bg-transparent pb-20">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">{t("billing.pos")}</h2>
          <button
            onClick={() => {
              setBarcodeMode(!barcodeMode);
              toast.info(
                barcodeMode ? t("inventory.scannerOff") : t("inventory.scannerOn"),
              );
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${barcodeMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400"}`}
          >
            <Zap size={16} /> {barcodeMode ? t("inventory.scannerOn") : t("inventory.enableScanner")}
          </button>
        </div>

        {pendingSyncCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CloudUpload className="text-amber-400" size={20} />
              <div>
                <p className="text-sm font-bold text-amber-400">
                  {pendingSyncCount} {t("billing.pendingSync") || "Sales Pending Sync"}
                </p>
                <p className="text-xs text-slate-400">
                  {t("billing.syncInfo") || "They will be uploaded automatically when you're back online."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder={t("billing.quickSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
          />
        </div>
        {barcodeMode && (
          <div className="panel-tech rounded-xl p-3 border border-slate-800">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {t("inventory.barcode")}
            </label>
            <input
              ref={scannerInputRef}
              type="text"
              onKeyDown={handleScannerInputKeyDown}
              onBlur={() => {
                if (!showAddItemModal && !showCameraModal) {
                  scannerInputRef.current?.focus();
                }
              }}
              placeholder={t("inventory.scanBarcodePlaceholder")}
              className="mt-2 w-full px-3 py-2 bg-[#09090b] border border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500"
            />
            {pendingBarcodeLookup && (
              <p className="mt-2 text-xs text-amber-400 font-semibold">
                {t("inventory.fetchingProductDetails")}
              </p>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileScan}
              className="hidden"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCameraScan}
                className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
              >
                {t("common.camera")}
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
              >
                {t("common.fromImage")}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableItems.map((item) => {
            const stock =
              item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
            return (
              <div
                key={item._id}
                onClick={() => addToCart(item)}
                className={`panel-tech p-4 rounded-2xl hover:border-indigo-500 cursor-pointer active:scale-95 flex flex-col justify-between h-28 shadow-sm ${lastScannedItemId === item._id ? "ring-2 ring-emerald-500/80" : ""}`}
              >
                <h3 className="font-bold text-sm line-clamp-2">{getItemName(item)}</h3>
                <div className="flex justify-between items-center">
                  <p className="font-black text-indigo-400">
                    {formatCurrency(item.batches?.[0]?.sellingPrice || 0)}
                  </p>
                  <span
                    className={`text-[10px] font-bold ${stock <= (item.alertQuantity || 5) ? "text-amber-400" : "text-slate-500"}`}
                  >
                    {stock} {t("dashboard.left")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="panel-tech rounded-2xl border border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">{t("billing.billingHistory")}</h3>
            <button
              onClick={() => setShowPosHistory((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              {showPosHistory ? t("common.cancel") : t("common.actions")}
            </button>
          </div>

          {showPosHistory && (
            <>
              <div className="flex items-center justify-between mt-4 mb-4">
                <span className="text-xs font-bold text-slate-400">
                  {t("reports.totalSales")}: {filteredSalesHistory.length}
                </span>
              </div>

              <div className="mb-4 flex items-center gap-2">
                {[
                  { key: "today", label: t("dashboard.live") },
                  { key: "week", label: "Week" },
                  { key: "all", label: "All" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setHistoryFilter(filter.key)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      historyFilter === filter.key
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {filteredSalesHistory.length === 0 ? (
                <p className="text-sm text-slate-500">{t("common.noData")}</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredSalesHistory.map((sale) => (
                    <div
                      key={sale._id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#111113] border border-slate-800"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          {sale.invoiceNumber || t("billing.invoice")}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(sale.createdAt).toLocaleString(currentLang === 'en' ? 'en-IN' : currentLang)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {t("billing.cash")}: {formatCurrency(sale.paymentSplit?.cash || 0)} | {t("billing.upi")}:
                          {formatCurrency(sale.paymentSplit?.upi || 0)} | {t("billing.credit")}:
                          {formatCurrency(sale.paymentSplit?.credit || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-400">
                          {formatCurrency(sale.totalAmount || 0)}
                        </p>
                        <button
                          onClick={() => navigate(`/dashboard/invoice/${sale._id}`)}
                          className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          {t("billing.generateInvoice")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-100 panel-tech rounded-3xl p-5 flex flex-col h-[calc(100vh-100px)] lg:sticky lg:top-20 shadow-xl">
        <h2 className="text-xl font-black mb-4 border-b border-slate-800 pb-3">
          {t("billing.cart")}{" "}
          <span className="text-indigo-400 text-sm bg-indigo-500/10 px-2 py-1 rounded ml-2">
            {cart.length}
          </span>
        </h2>

        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {cart.map((c) => (
            <div
              key={c.itemId}
              className={`flex justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 ${lastScannedItemId === c.itemId ? "border-emerald-500/70 bg-emerald-500/10" : ""}`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-bold truncate">{c.name}</p>
                <p className="text-xs text-indigo-400 font-black">
                  {formatCurrency(c.sellingPrice)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#09090b] border border-slate-700 rounded-lg">
                  <button
                    onClick={() => decreaseQty(c.itemId)}
                    className="p-1.5 text-slate-400"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">
                    {c.quantity}
                  </span>
                  <button
                    onClick={() => increaseQty(c.itemId)}
                    className="p-1.5 text-slate-400"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(c.itemId)}
                  className="p-1.5 text-rose-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
              <p className="text-sm font-bold">{t("billing.noItemsInCart")}</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center mb-4 bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 font-bold uppercase text-xs">
              {t("billing.total")}
            </span>
            <span className="text-2xl font-black text-indigo-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <input
              type="tel"
              placeholder={t("settings.phoneNumber")}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "cash",
                  label: t("billing.cash"),
                  border: "border-emerald-500/20",
                },
                { key: "upi", label: t("billing.upi"), border: "border-indigo-500/20" },
                {
                  key: "credit",
                  label: t("billing.credit"),
                  border: "border-rose-500/30",
                },
              ]
.map(({ key, label, border }) => (
                <input
                  key={key}
                  type="number"
                  placeholder={label}
                  value={payments[key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (key === "upi") {
                      setIsUpiAuto(false);
                    }
                    if (key === "cash" || key === "credit") {
                      setIsUpiAuto(true);
                    }
                    setPayments({ ...payments, [key]: value });
                  }}
                  className={`w-full p-2.5 bg-[#09090b] border ${border} rounded-xl text-white text-sm outline-none`}
                />
              ))}
            </div>
          </div>

          {upiLink && (
            <div className="mb-4 flex flex-col items-center bg-white p-3 rounded-xl border-2 border-slate-700">
              <p className="text-slate-900 text-xs font-black mb-2 uppercase tracking-widest">
                {t("billing.scanToPay")} {formatCurrency(upiAmount)}
              </p>
              <QRCodeSVG value={upiLink} size={100} />
            </div>
          )}

          {!UPI_ID && upiAmount > 0 && (
            <p className="text-amber-400 text-xs font-bold mb-3 text-center">
              ⚠️ {t("billing.addUpiPrompt")}
            </p>
          )}

          <button
            onClick={handleCheckoutClick}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all active:scale-95"
          >
            {t("billing.checkout")} {formatCurrency(grandTotal)}
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="panel-tech rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <Receipt size={32} className="mx-auto mb-2 opacity-80" />
              <h3 className="text-xl font-black">{t("common.confirm")}</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">{t("billing.item")}</span>
                <span className="font-bold">{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("billing.cash")}</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(payments.cash || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("billing.upi")}</span>
                <span className="font-bold text-indigo-400">
                  {formatCurrency(payments.upi || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("billing.credit")}</span>
                <span className="font-bold text-rose-400">
                  {formatCurrency(payments.credit || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="font-black">{t("billing.total")}</span>
                <span className="font-black text-indigo-400 text-lg">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 text-slate-300 font-bold bg-slate-800 rounded-xl"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={completeSale}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? t("common.processing") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowAddItemModal(false)}
          />
          <form
            onSubmit={handleSaveScannedItem}
            className="relative w-full max-w-md panel-tech rounded-2xl border border-slate-700 p-5 space-y-4"
          >
            <h3 className="text-lg font-black">{t("inventory.addProduct")}</h3>
            {isAutoFillingProduct && (
              <p className="text-xs text-indigo-300">
                {t("inventory.fetchingProductDetails")}
              </p>
            )}
            {autoFillSource && !isAutoFillingProduct && (
              <p className="text-xs text-emerald-300">
                {t("inventory.autoFilledFrom", { source: autoFillSource })}
              </p>
            )}
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">
                {t("inventory.itemName")}
              </label>
              <input
                type="text"
                value={addItemForm.name}
                onChange={(e) =>
                  setAddItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                placeholder={t("inventory.itemName")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.categories")}
                </label>
                <input
                  type="text"
                  value={addItemForm.category}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                  placeholder="General"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.unitType")}
                </label>
                <select
                  value={addItemForm.unit}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                >
                  <option value="piece">{t("common.piece")}</option>
                  <option value="kg">{t("common.kg")}</option>
                  <option value="litre">{t("common.litre")}</option>
                  <option value="box">{t("common.box")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">
                {t("inventory.barcode")}
              </label>
              <input
                type="text"
                readOnly
                value={addItemForm.barcode}
                className="mt-1 w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.taxPercent")}
                </label>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={addItemForm.taxPercent}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({
                      ...prev,
                      taxPercent: e.target.value,
                    }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.hsnCode")}
                </label>
                <input
                  type="text"
                  value={addItemForm.hsn}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({ ...prev, hsn: e.target.value }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                  placeholder={t("common.optional")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.sellingPrice")} *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={addItemForm.sellingPrice}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({
                      ...prev,
                      sellingPrice: e.target.value,
                    }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  {t("inventory.purchasePrice")}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addItemForm.purchasePrice}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({
                      ...prev,
                      purchasePrice: e.target.value,
                    }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">
                {t("inventory.currentQuantity")} *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={addItemForm.quantity}
                onChange={(e) =>
                  setAddItemForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddItemModal(false);
                  scannerInputRef.current?.focus();
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSavingScannedItem}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
              >
                {isSavingScannedItem ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={closeCameraScan}
          />
          <div className="relative w-full max-w-lg panel-tech rounded-2xl border border-slate-700 p-4">
            <h3 className="text-lg font-black mb-3">{t("common.camera")}</h3>
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {t("inventory.alignBarcode")}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={closeCameraScan}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleScanFromCameraFrame}
                disabled={isCameraStarting}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
              >
                {isCameraStarting ? t("inventory.startingCamera") : t("common.actions")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
