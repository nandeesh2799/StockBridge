import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import API from "../../api/axiosInstance";
import {
  PackageMinus,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

const StockAdjustment = () => {
  const { t } = useTranslation();
  const { items = [], setItems } = useOutletContext();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [type, setType] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = items.find((item) => item._id === selectedItemId);
  const getTotalStock = (item) =>
    item?.batches?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;

  const handleAdjustment = async () => {
    if (!selectedItemId || !quantity || quantity <= 0) {
      toast.error("Please select item and valid quantity");
      return;
    }
    const qty = Number(quantity);
    const currentStock = getTotalStock(selectedItem);
    if (
      (type === "reduce" || type === "expired" || type === "damaged") &&
      qty > currentStock
    ) {
      toast.error("Not enough stock available");
      return;
    }
    setIsSubmitting(true);
    let updatedBatches = [...selectedItem.batches];
    if (type === "add") {
      updatedBatches.push({
        purchasePrice: 0,
        sellingPrice: selectedItem.batches?.[0]?.sellingPrice || 0,
        quantity: qty,
        addedDate: new Date().toISOString(),
      });
    } else {
      let remaining = qty;
      updatedBatches = updatedBatches.map((batch) => {
        if (remaining <= 0) return batch;
        const deduct = Math.min(batch.quantity, remaining);
        remaining -= deduct;
        return { ...batch, quantity: batch.quantity - deduct };
      });
    }
    const adjustmentEntry = {
      type,
      quantity: qty,
      reason: reason || "Manual Adjustment",
      date: new Date().toISOString(),
    };
    try {
      const res = await API.put(`/items/${selectedItemId}`, {
        batches: updatedBatches.filter((b) => b.quantity > 0),
        adjustments: selectedItem.adjustments
          ? [adjustmentEntry, ...selectedItem.adjustments]
          : [adjustmentEntry],
      });
      setItems((prev) =>
        prev.map((item) =>
          item._id === selectedItemId ? res.data.data : item,
        ),
      );
      toast.success(
        `Stock ${type === "add" ? "increased" : "reduced"} successfully!`,
      );
      setQuantity("");
      setReason("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to sync adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case "add":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
      case "reduce":
        return "bg-amber-500/20 text-amber-400 border-amber-500/20";
      default:
        return "bg-rose-500/20 text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div className="text-white space-y-6 bg-transparent min-h-screen pb-20">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          {t("Stock Adjustment")}
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-0.5">
          {t("Manually Adjust")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: FORM */}
        <div className="panel-tech rounded-3xl p-6 sm:p-8 shadow-sm h-fit">
          <div className="flex items-center gap-2 text-indigo-400 mb-6">
            <PackageMinus size={20} />
            <h2 className="text-lg font-bold">{t("New Adjustment")}</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                {t("Select Item")}
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
              >
                <option value="">{t("Choose Item")}</option>
                {items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({t("inStock")}: {getTotalStock(item)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  {t("Adjustment Type")}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
                >
                  <option value="add">{t("Add Stock Option")}</option>
                  <option value="reduce">{t("Reduce Stock Option")}</option>
                  <option value="expired">{t("Mark Expired")}</option>
                  <option value="damaged">{t("Mark Damaged")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  {t("Quantity")}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                {t("Reason Optional")}
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Found damaged during shifting"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 bg-[#09090b] border border-slate-700 rounded-xl text-sm font-medium focus:border-indigo-500 resize-none text-white placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={handleAdjustment}
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all mt-4"
            >
              {isSubmitting ? t("Updating Database") : t("Apply Adjustment")}
            </button>
          </div>
        </div>

        {/* RIGHT: HISTORY */}
        <div className="panel-tech rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold mb-6 text-white">
            {t("Recent Adjustments")}
          </h2>
          {!selectedItem ? (
            <div className="text-center text-slate-500 py-10 opacity-70">
              <PackageMinus size={40} className="mx-auto mb-2" />
              <p className="text-sm font-bold">{t("Select Item To View")}</p>
            </div>
          ) : selectedItem.adjustments?.length > 0 ? (
            <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
              {selectedItem.adjustments.map((adj, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl items-start"
                >
                  <div
                    className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${getBadgeStyle(adj.type)}`}
                  >
                    {adj.type === "add" ? (
                      <ArrowUp size={14} />
                    ) : adj.type === "reduce" ? (
                      <ArrowDown size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-white capitalize text-sm">
                        {adj.type}
                      </p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {new Date(adj.date).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm font-black mt-0.5 text-slate-300">
                      {adj.type === "add" ? "+" : "-"} {adj.quantity} Items
                    </p>
                    {adj.reason && (
                      <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-start gap-1">
                        <AlertCircle size={12} className="mt-0.5" />{" "}
                        {adj.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-10 opacity-70">
              <p className="text-sm font-bold">{t("No Adjustments")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;
