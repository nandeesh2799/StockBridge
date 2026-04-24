import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Truck,
  Phone,
  Mail,
  X,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import API from "../../api/axiosInstance";

const Suppliers = () => {
  const { items } = useOutletContext();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    items: [{ itemId: "", name: "", quantity: "", unitCost: "" }],
    amountPaid: "",
    invoiceNumber: "",
    notes: "",
  });

  const fetchSuppliers = async () => {
    try {
      const res = await API.get("/suppliers");
      setSuppliers(res.data.data || []);
    } catch {
      toast.error("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async () => {
    if (!form.name || !form.phone)
      return toast.error("Name and phone are required.");
    setIsSubmitting(true);
    try {
      const res = await API.post("/suppliers", form);
      setSuppliers((prev) => [res.data.data, ...prev]);
      toast.success("Supplier added successfully!");
      setForm({ name: "", phone: "", email: "", address: "", gstin: "" });
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPurchase = async () => {
    const validItems = purchaseForm.items.filter(
      (i) => i.quantity && i.unitCost,
    );
    if (validItems.length === 0)
      return toast.error("Add at least one item with quantity and cost.");
    const totalAmount = validItems.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unitCost),
      0,
    );
    setIsSubmitting(true);
    try {
      const payload = {
        items: validItems.map((i) => ({
          itemId: i.itemId || null,
          name: i.name,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        })),
        totalAmount,
        amountPaid: Number(purchaseForm.amountPaid || 0),
        invoiceNumber: purchaseForm.invoiceNumber,
        notes: purchaseForm.notes,
      };
      const res = await API.post(
        `/suppliers/${selectedSupplier._id}/purchase`,
        payload,
      );
      setSuppliers((prev) =>
        prev.map((s) => (s._id === selectedSupplier._id ? res.data.data : s)),
      );
      toast.success(`Purchase of ₹${totalAmount} recorded! Stock updated.`);
      setIsPurchaseOpen(false);
      setSelectedSupplier(null);
      setPurchaseForm({
        items: [{ itemId: "", name: "", quantity: "", unitCost: "" }],
        amountPaid: "",
        invoiceNumber: "",
        notes: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record purchase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPurchaseRow = () =>
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemId: "", name: "", quantity: "", unitCost: "" },
      ],
    }));

  const updatePurchaseItem = (idx, field, value) => {
    setPurchaseForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "itemId" && value) {
        const found = items.find((i) => i._id === value);
        if (found) {
          updated[idx].name = found.name;
          updated[idx].unitCost = found.batches?.[0]?.purchasePrice || "";
        }
      }
      return { ...prev, items: updated };
    });
  };

  return (
    <div className="text-white space-y-6 bg-transparent min-h-screen pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Supplier Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track vendors, record purchases, and update stock automatically.
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Truck size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">No Suppliers Found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suppliers.map((supplier) => (
            <div key={supplier._id} className="panel-tech rounded-2xl overflow-hidden">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-lg">
                    {supplier.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">
                      {supplier.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone size={12} /> {supplier.phone}
                      </span>
                      {supplier.email && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail size={12} /> {supplier.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      Total Purchased
                    </p>
                    <p className="font-black text-emerald-400">
                      ₹
                      {new Intl.NumberFormat("en-IN").format(
                        supplier.totalPurchased,
                      )}
                    </p>
                  </div>
                  {supplier.totalDue > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-bold">
                        Due
                      </p>
                      <p className="font-black text-rose-400">
                        ₹
                        {new Intl.NumberFormat("en-IN").format(
                          supplier.totalDue,
                        )}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setIsPurchaseOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                  >
                    <ShoppingBag size={16} /> New Purchase
                  </button>
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === supplier._id ? null : supplier._id,
                      )
                    }
                    className="p-2 text-slate-400 bg-slate-800 rounded-lg"
                  >
                    {expandedId === supplier._id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === supplier._id &&
                supplier.purchaseHistory?.length > 0 && (
                  <div className="border-t border-slate-800 p-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                      Purchase History
                    </h4>
                    <div className="space-y-3">
                      {supplier.purchaseHistory.map((purchase, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl"
                        >
                          <div>
                            <p className="text-sm font-bold text-white">
                              {purchase.items?.length} Items
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(purchase.date).toLocaleDateString(
                                "en-IN",
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-400">
                              ₹
                              {new Intl.NumberFormat("en-IN").format(
                                purchase.totalAmount,
                              )}
                            </p>
                            {purchase.totalAmount > purchase.amountPaid && (
                              <p className="text-xs text-rose-400">
                                Due: ₹
                                {new Intl.NumberFormat("en-IN").format(
                                  purchase.totalAmount - purchase.amountPaid,
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {isDrawerOpen && (
        <>
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-96 panel-tech border-l p-6 pb-24 z-50 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Add Supplier</h2>
              <button onClick={() => setIsDrawerOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: "Name *",
                  key: "name",
                  placeholder: "Supplier name",
                },
                {
                  label: "Phone *",
                  key: "phone",
                  placeholder: "10-digit number",
                },
                {
                  label: "Email",
                  key: "email",
                  placeholder: "email@example.com",
                },
                {
                  label: "Address",
                  key: "address",
                  placeholder: "Business address",
                },
                { label: "GSTIN", key: "gstin", placeholder: "Optional" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    {label}
                  </label>
                  <input
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    placeholder={placeholder}
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isPurchaseOpen && selectedSupplier && (
        <>
          <div
            onClick={() => setIsPurchaseOpen(false)}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-125 panel-tech border-l p-6 pb-24 z-50 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black">New Purchase</h2>
                <p className="text-sm text-slate-400">
                  from {selectedSupplier.name}
                </p>
              </div>
              <button onClick={() => setIsPurchaseOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                  Items
                </label>
                {purchaseForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                    <select
                      value={item.itemId}
                      onChange={(e) =>
                        updatePurchaseItem(idx, "itemId", e.target.value)
                      }
                      className="col-span-2 p-2 bg-[#111113] border border-slate-800 rounded-xl text-white text-sm outline-none"
                    >
                      <option value="">Select from inventory (optional)</option>
                      {items.map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) =>
                        updatePurchaseItem(idx, "name", e.target.value)
                      }
                      className="p-2 bg-[#111113] border border-slate-800 rounded-xl text-white text-sm outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updatePurchaseItem(idx, "quantity", e.target.value)
                      }
                      className="p-2 bg-[#111113] border border-slate-800 rounded-xl text-white text-sm outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Unit Cost ₹"
                      value={item.unitCost}
                      onChange={(e) =>
                        updatePurchaseItem(idx, "unitCost", e.target.value)
                      }
                      className="col-span-2 p-2 bg-[#111113] border border-slate-800 rounded-xl text-white text-sm outline-none"
                    />
                  </div>
                ))}
                <button
                  onClick={addPurchaseRow}
                  className="text-indigo-400 text-sm font-bold flex items-center gap-1 mt-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Amount Paid
                </label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  value={purchaseForm.amountPaid}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      amountPaid: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Supplier Invoice No.
                </label>
                <input
                  placeholder="Optional"
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsPurchaseOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPurchase}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Record Purchase"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Suppliers;
