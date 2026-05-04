import { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, Search, Receipt, Zap } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import API from "../../api/axiosInstance";

const POS = () => {
  const navigate = useNavigate();
  const {
    items,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [lastScannedItemId, setLastScannedItemId] = useState("");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isSavingScannedItem, setIsSavingScannedItem] = useState(false);
  const [pendingBarcodeLookup, setPendingBarcodeLookup] = useState(false);
  const [isAutoFillingProduct, setIsAutoFillingProduct] = useState(false);
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
    if (currentQty >= stock)
      return toast.error(`Only ${stock} units of ${product.name} in stock!`);
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.itemId === product._id ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          itemId: product._id,
          batchId: product.batches?.[0]?._id,
          name: product.name,
          sellingPrice: product.batches?.[0]?.sellingPrice || 0,
          purchasePrice: product.batches?.[0]?.purchasePrice || 0,
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
  const normalizeTagValue = (value = "") =>
    value
      .replace(/^en:/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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
      const entryName = (entry.name || "").toLowerCase();
      const entryCategory = (entry.category || "").toLowerCase();
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

  const mapOpenFoodFactsDetails = (barcode, product = {}) => {
    const categories = Array.isArray(product?.categories_tags)
      ? product.categories_tags
      : [];
    const firstCategory = normalizeTagValue(categories[0] || "");
    const quantityText = product?.quantity || "";

    const inferredName =
      product?.product_name?.trim() ||
      product?.product_name_en?.trim() ||
      product?.generic_name?.trim() ||
      "";
    const inferredCategory = firstCategory || "";
    const priceHints = estimatePricesFromLocalInventory(
      inferredName,
      inferredCategory,
    );

    // Try to extract price from labels or names if present (crowdsourced data)
    let extractedPrice = "";
    const priceMatch = (inferredName || "").match(/MRP[:\s]*(\d+)/i) || 
                       (product?.labels || "").match(/MRP[:\s]*(\d+)/i);
    if (priceMatch) extractedPrice = priceMatch[1];

    return {
      barcode,
      name: inferredName,
      category: inferredCategory,
      unit: inferUnit(quantityText),
      taxPercent: "0",
      hsn: "",
      sellingPrice: extractedPrice || priceHints.sellingPrice,
      purchasePrice: priceHints.purchasePrice || (extractedPrice ? Math.round(extractedPrice * 0.8) : ""),
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

  const fetchProductFromAllSources = async (barcode, timeoutMs = 2000) => {
    const sources = [
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      `https://world.openproductsfacts.org/api/v0/product/${barcode}.json`,
      `https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`,
    ];

    for (const url of sources) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          return { product: data.product, sourceName: url.split(".")[1] };
        }
      } catch (err) {
        continue;
      }
    }
    return null;
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
      toast.success("Item added");
      return;
    }

    toast.info("New product detected");
    setPendingBarcodeLookup(true);

    try {
      const result = await fetchProductFromAllSources(barcode, 1500);
      if (result) {
        openAddItemModal(mapOpenFoodFactsDetails(barcode, result.product));
        setAutoFillSource(result.sourceName);
      } else {
        openAddItemModal({ barcode });
      }
    } catch {
      openAddItemModal({ barcode });
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
      toast.error("Name, selling price and quantity are required.");
      return;
    }
    if (!addItemForm.barcode) {
      toast.error("Barcode is required.");
      return;
    }

    setIsSavingScannedItem(true);
    try {
      const payload = {
        name: addItemForm.name.trim(),
        barcode: addItemForm.barcode.trim(),
        category: addItemForm.category.trim() || "General",
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
      toast.success("Item added");
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
        toast.error("No barcode detected in camera frame.");
        return;
      }
      closeCameraScan();
      await handleScan(value);
    } catch {
      toast.error("Unable to read barcode from camera.");
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
        const result = await fetchProductFromAllSources(barcode, 2500);
        if (!result || cancelled) return;
        const mapped = mapOpenFoodFactsDetails(barcode, result.product);
        mergeAutoFillIntoForm(barcode, mapped);
        setAutoFillSource(result.sourceName);
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
    if (cartItem?.quantity >= stock) return toast.error("Not enough stock!");
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
  const upiAmount = Number(payments.upi || 0);
  const upiLink =
    upiAmount > 0 && UPI_ID
      ? `upi://pay?pa=${UPI_ID}&pn=${SHOP_NAME}&am=${upiAmount}&cu=INR`
      : null;

  const handleCheckoutClick = () => {
    if (cart.length === 0) return toast.error("Cart is empty.");
    const cash = Number(payments.cash || 0);
    const upi = Number(payments.upi || 0);
    const credit = Number(payments.credit || 0);
    if (
      Math.round((cash + upi + credit) * 100) !== Math.round(grandTotal * 100)
    )
      return toast.error(`Split must equal ₹${grandTotal.toFixed(2)}`);
    if (credit > 0 && customerPhone.trim().length < 10)
      return toast.error("10-digit phone required for Credit.");
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
            toast.error("Error registering customer.");
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
          return {
            ...item,
            batches: item.batches.map((b, idx) =>
              idx === 0
                ? {
                    ...b,
                    quantity: Math.max(0, b.quantity - cartItem.quantity),
                  }
                : b,
            ),
          };
        }),
      );
      if (customerPhone && customerPhone.trim().length >= 10) {
        const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);
        const msg = `🧾 *${SHOP_NAME}*\nTotal: ₹${grandTotal.toFixed(2)}\nCredit: ₹${credit.toFixed(2)}\n🙏 Thanks!`;
        window.open(
          `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
      setCart([]);
      setPayments({ cash: "", upi: "", credit: "" });
      setCustomerPhone("");
      setShowConfirmModal(false);
      toast.success("Bill Generated! 🚀");
      navigate(`/dashboard/invoice/${savedSale._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Sale failed!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableItems = items.filter((item) => {
    const stock = item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
    return stock > 0 && item.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-white min-h-screen bg-transparent pb-20">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Point of Sale</h2>
          <button
            onClick={() => {
              setBarcodeMode(!barcodeMode);
              toast.info(
                barcodeMode ? "Scanner OFF" : "Scanner ON — scan any barcode!",
              );
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${barcodeMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400"}`}
          >
            <Zap size={16} /> {barcodeMode ? "Scanner ON" : "Enable Scanner"}
          </button>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search Items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
          />
        </div>
        {barcodeMode && (
          <div className="panel-tech rounded-xl p-3 border border-slate-800">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Scanner Input
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
              placeholder="Scan barcode and press Enter"
              className="mt-2 w-full px-3 py-2 bg-[#09090b] border border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500"
            />
            {pendingBarcodeLookup && (
              <p className="mt-2 text-xs text-amber-400 font-semibold">
                Checking product info... you can continue billing.
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
                Scan via Camera
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
              >
                Scan via Image
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
                <h3 className="font-bold text-sm line-clamp-2">{item.name}</h3>
                <div className="flex justify-between items-center">
                  <p className="font-black text-indigo-400">
                    ₹{item.batches?.[0]?.sellingPrice || 0}
                  </p>
                  <span
                    className={`text-[10px] font-bold ${stock <= (item.alertQuantity || 5) ? "text-amber-400" : "text-slate-500"}`}
                  >
                    {stock} Left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-100 panel-tech rounded-3xl p-5 flex flex-col h-[calc(100vh-100px)] lg:sticky lg:top-20 shadow-xl">
        <h2 className="text-xl font-black mb-4 border-b border-slate-800 pb-3">
          Cart{" "}
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
                  ₹{c.sellingPrice}
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
              <p className="text-sm font-bold">Cart is empty</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center mb-4 bg-slate-800/50 p-3 rounded-xl">
            <span className="text-slate-400 font-bold uppercase text-xs">
              Total
            </span>
            <span className="text-2xl font-black text-indigo-400">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <input
              type="tel"
              placeholder="Customer Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "cash",
                  label: "Cash",
                  border: "border-emerald-500/20",
                },
                { key: "upi", label: "UPI", border: "border-indigo-500/20" },
                {
                  key: "credit",
                  label: "Credit",
                  border: "border-rose-500/30",
                },
              ].map(({ key, label, border }) => (
                <input
                  key={key}
                  type="number"
                  placeholder={label}
                  value={payments[key]}
                  onChange={(e) =>
                    setPayments({ ...payments, [key]: e.target.value })
                  }
                  className={`w-full p-2.5 bg-[#09090b] border ${border} rounded-xl text-white text-sm outline-none`}
                />
              ))}
            </div>
          </div>

          {upiLink && (
            <div className="mb-4 flex flex-col items-center bg-white p-3 rounded-xl border-2 border-slate-700">
              <p className="text-slate-900 text-xs font-black mb-2 uppercase tracking-widest">
                Scan to Pay ₹{upiAmount}
              </p>
              <QRCodeSVG value={upiLink} size={100} />
            </div>
          )}

          {!UPI_ID && upiAmount > 0 && (
            <p className="text-amber-400 text-xs font-bold mb-3 text-center">
              ⚠️ Add your UPI ID in Settings to generate QR codes.
            </p>
          )}

          <button
            onClick={handleCheckoutClick}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all active:scale-95"
          >
            Checkout ₹{grandTotal.toFixed(2)}
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
              <h3 className="text-xl font-black">Confirm Bill</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Items</span>
                <span className="font-bold">{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cash</span>
                <span className="font-bold text-emerald-400">
                  ₹{Number(payments.cash || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UPI</span>
                <span className="font-bold text-indigo-400">
                  ₹{Number(payments.upi || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit</span>
                <span className="font-bold text-rose-400">
                  ₹{Number(payments.credit || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="font-black">Total</span>
                <span className="font-black text-indigo-400 text-lg">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 text-slate-300 font-bold bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={completeSale}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm Sale"}
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
            <h3 className="text-lg font-black">Add Scanned Item</h3>
            {isAutoFillingProduct && (
              <p className="text-xs text-indigo-300">
                Auto-detecting product details from barcode...
              </p>
            )}
            {autoFillSource && !isAutoFillingProduct && (
              <p className="text-xs text-emerald-300">
                Details auto-filled from {autoFillSource}. You can edit anything.
              </p>
            )}
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">
                Name
              </label>
              <input
                type="text"
                value={addItemForm.name}
                onChange={(e) =>
                  setAddItemForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                placeholder="Product name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  Category
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
                  Unit
                </label>
                <select
                  value={addItemForm.unit}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                >
                  <option value="piece">Piece</option>
                  <option value="kg">Kg</option>
                  <option value="litre">Litre</option>
                  <option value="box">Box</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase">
                Barcode
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
                  GST %
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
                  HSN
                </label>
                <input
                  type="text"
                  value={addItemForm.hsn}
                  onChange={(e) =>
                    setAddItemForm((prev) => ({ ...prev, hsn: e.target.value }))
                  }
                  className="mt-1 w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl outline-none focus:border-indigo-500"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase">
                  Selling Price *
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
                  Purchase Price
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
                Quantity *
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingScannedItem}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
              >
                {isSavingScannedItem ? "Saving..." : "Save & Add"}
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
            <h3 className="text-lg font-black mb-3">Scan via Camera</h3>
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Auto-scanning is active. Hold barcode in front of the camera.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={closeCameraScan}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScanFromCameraFrame}
                disabled={isCameraStarting}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60"
              >
                {isCameraStarting ? "Starting camera..." : "Scan Now (Manual)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
