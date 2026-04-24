import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
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
} from "lucide-react";

const Inventory = () => {
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

  const [formData, setFormData] = useState({
    name: "",
    sellingPrice: "",
    unitType: "piece",
    lowStockThreshold: 5,
    taxPercent: 0,
    hsn: "",
    batchCostPrice: "",
    batchQuantity: "",
    batchExpiryDate: "",
  });

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
      !formData.sellingPrice ||
      !formData.batchCostPrice ||
      !formData.batchQuantity
    ) {
      toast.error("Required fields missing!");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      name: formData.name,
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
        toast.success("Item updated successfully");
      } else {
        const res = await API.post("/items", payload);
        setItems((prev) => [...prev, res.data.data]);
        toast.success("Item added successfully");
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/items/${deleteId}`);
      setItems((prev) => prev.filter((item) => item._id !== deleteId));
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete item");
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
      toast.error("Select at least one item for bulk update.");
      return;
    }
    const hasAnyUpdate =
      bulkValues.priceAdjustmentValue !== "" ||
      bulkValues.taxPercent !== "" ||
      bulkValues.lowStockThreshold !== "";
    if (!hasAnyUpdate) {
      toast.error("Add at least one change to apply.");
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
      toast.success(`Bulk updated ${updatedMap.size} items.`);
      resetBulkPanel();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bulk update failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-white space-y-6 bg-transparent min-h-dvh pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Inventory</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            Manage your products and batches.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowBulkPanel(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors"
          >
            <UploadCloud size={16} />{" "}
            <span className="hidden sm:inline">Bulk Update</span>
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} /> Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search Items"
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
            <option value="recent">Recently Added</option>
            <option value="low_stock">Low Stock First</option>
            <option value="high_value">High Value First</option>
          </select>
          <ArrowUpDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={14}
          />
        </div>
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
                    {item.name}
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
                    ? new Date(item.updatedAt).toLocaleDateString("en-IN")
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
              {editingItemId ? "Edit Item" : "Add New Item"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block tracking-wider">
                  Item Name
                </label>
                <input
                  name="name"
                  placeholder="e.g. Maggi"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    Selling Price
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
                    Unit Type
                  </label>
                  <select
                    name="unitType"
                    value={formData.unitType}
                    onChange={handleChange}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kg</option>
                    <option value="litre">Litre</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    Alert Quantity
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
                    GST %
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
                  HSN Code
                </label>
                <input
                  name="hsn"
                  placeholder="Optional"
                  value={formData.hsn}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>
              <div className="border-t border-slate-800 pt-4 mt-2">
                <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-widest">
                  Initial Batch Info
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                      Purchase Price
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
                      Current Quantity
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
                    Expiry Date
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
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
                >
                  {isSubmitting ? "Saving..." : "Save Item"}
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
            <h3 className="text-xl font-black text-white mb-2">Delete Item?</h3>
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
              <h3 className="text-xl font-black text-white">Bulk Update Items</h3>
              <p className="text-sm text-slate-400 mt-1">
                Select items below, then apply common updates in one action.
              </p>
            </div>

            <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800">
              {filteredItems.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No matching items found.</p>
              ) : (
                filteredItems.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800/30"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
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
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
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
    </div>
  );
};

export default Inventory;
