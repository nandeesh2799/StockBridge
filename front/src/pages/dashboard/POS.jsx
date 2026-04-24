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
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!barcodeMode) return;
    let buffer = "";
    let lastTime = Date.now();
    const handleKey = (e) => {
      const now = Date.now();
      if (now - lastTime > 300) buffer = "";
      buffer += e.key;
      lastTime = now;
      if (e.key === "Enter" && buffer.length > 3) {
        const barcode = buffer.replace("Enter", "").trim();
        const found = items.find(
          (i) =>
            i.barcode === barcode ||
            i.hsn === barcode ||
            i.name.toLowerCase() === barcode.toLowerCase(),
        );
        if (found) {
          addToCart(found);
          toast.success(`${found.name} added via scanner!`);
        } else toast.error(`No item found for: ${barcode}`);
        buffer = "";
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeMode, items]);

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

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableItems.map((item) => {
            const stock =
              item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
            return (
              <div
                key={item._id}
                onClick={() => addToCart(item)}
                className="panel-tech p-4 rounded-2xl hover:border-indigo-500 cursor-pointer active:scale-95 flex flex-col justify-between h-28 shadow-sm"
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
              className="flex justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-slate-700/50"
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
    </div>
  );
};

export default POS;
