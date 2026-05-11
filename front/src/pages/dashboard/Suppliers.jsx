import { useState, useEffect, useMemo } from "react";
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
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Wallet,
} from "lucide-react";
import API from "../../api/axiosInstance";

const emptySupplierForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
};

const emptyPurchaseForm = {
  items: [{ itemId: "", name: "", quantity: "", unitCost: "" }],
  amountPaid: "",
  invoiceNumber: "",
  notes: "",
};

const formatCurrency = (amount = 0) =>
  `₹${new Intl.NumberFormat("en-IN").format(Number(amount) || 0)}`;

const Suppliers = () => {
  const { items } = useOutletContext();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // 'name', 'totalPurchased', 'totalDue'
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc', 'desc'
  const [isPayDueOpen, setIsPayDueOpen] = useState(false);
  const [payDueAmount, setPayDueAmount] = useState("");

  const [form, setForm] = useState(emptySupplierForm);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);

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

  const filteredAndSortedSuppliers = useMemo(
    () =>
      suppliers
        .filter((s) => {
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          const name = String(s.name || "").toLowerCase();
          const phone = String(s.phone || "");
          const email = String(s.email || "").toLowerCase();
          const gstin = String(s.gstin || "").toLowerCase();
          return (
            name.includes(q) ||
            phone.includes(searchQuery.trim()) ||
            email.includes(q) ||
            gstin.includes(q)
          );
        })
        .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "totalPurchased") {
        comparison = a.totalPurchased - b.totalPurchased;
      } else if (sortBy === "totalDue") {
        comparison = a.totalDue - b.totalDue;
      }

          return sortOrder === "asc" ? comparison : -comparison;
        }),
    [suppliers, searchQuery, sortBy, sortOrder],
  );

  const supplierStats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const payableSuppliers = suppliers.filter((s) => Number(s.totalDue) > 0).length;
    const totalPurchased = suppliers.reduce(
      (sum, s) => sum + Number(s.totalPurchased || 0),
      0,
    );
    const totalDue = suppliers.reduce((sum, s) => sum + Number(s.totalDue || 0), 0);
    return { totalSuppliers, payableSuppliers, totalPurchased, totalDue };
  }, [suppliers]);

  const handleAddSupplier = async () => {
    const payload = {
      ...form,
      name: String(form.name || "").trim(),
      phone: String(form.phone || "").replace(/\D/g, "").trim(),
      email: String(form.email || "").trim(),
      address: String(form.address || "").trim(),
      gstin: String(form.gstin || "").trim().toUpperCase(),
    };

    if (!payload.name || !payload.phone)
      return toast.error("Name and phone are required.");
    if (payload.phone.length < 10) {
      return toast.error("Phone should be at least 10 digits.");
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return toast.error("Enter a valid email address.");
    }

    setIsSubmitting(true);
    try {
      if (form._id) {
        const res = await API.put(`/suppliers/${form._id}`, payload);
        setSuppliers((prev) =>
          prev.map((s) => (s._id === form._id ? res.data.data : s)),
        );
        toast.success("Supplier updated successfully!");
      } else {
        const res = await API.post("/suppliers", payload);
        setSuppliers((prev) => [res.data.data, ...prev]);
        toast.success("Supplier added successfully!");
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptySupplierForm);
    setSelectedSupplier(null);
    setIsDrawerOpen(false);
  };

  const openEditDrawer = (supplier) => {
    setForm(supplier);
    setSelectedSupplier(supplier);
    setIsDrawerOpen(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await API.delete(`/suppliers/${supplierId}`);
        setSuppliers((prev) => prev.filter((s) => s._id !== supplierId));
        toast.success("Supplier deleted successfully!");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete supplier.");
      }
    }
  };

  const handlePayDue = async () => {
    const amount = Number(payDueAmount);
    if (!selectedSupplier || !payDueAmount || amount <= 0) {
      return toast.error("Please enter a valid amount to pay.");
    }
    if (amount > Number(selectedSupplier.totalDue || 0)) {
      return toast.error("Amount paid cannot exceed total due.");
    }
    setIsSubmitting(true);
    try {
      const res = await API.post(`/suppliers/${selectedSupplier._id}/pay-due`, {
        amount,
      });
      setSuppliers((prev) =>
        prev.map((s) => (s._id === selectedSupplier._id ? res.data.data : s)),
      );
      toast.success(`Paid ${formatCurrency(amount)} to ${selectedSupplier.name}.`);
      setIsPayDueOpen(false);
      setPayDueAmount("");
      setSelectedSupplier(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPurchase = async () => {
    const validItems = purchaseForm.items.filter(
      (i) => i.name && Number(i.quantity) > 0 && Number(i.unitCost) > 0,
    );
    if (validItems.length === 0)
      return toast.error("Add at least one valid item with name, quantity and cost.");
    const totalAmount = validItems.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unitCost),
      0,
    );
    const amountPaid = Number(purchaseForm.amountPaid || 0);
    if (amountPaid < 0 || amountPaid > totalAmount) {
      return toast.error("Amount paid must be between 0 and total amount.");
    }
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
        amountPaid,
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
      setPurchaseForm(emptyPurchaseForm);
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

  const removePurchaseRow = (idx) => {
    setPurchaseForm((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
    });
  };

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

  const purchasePreview = useMemo(() => {
    const total = purchaseForm.items.reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.unitCost || 0),
      0,
    );
    const paid = Number(purchaseForm.amountPaid || 0);
    const due = Math.max(0, total - Math.max(0, paid));
    return { total, paid: Number.isFinite(paid) ? paid : 0, due };
  }, [purchaseForm]);

  const closePurchaseModal = () => {
    setIsPurchaseOpen(false);
    setSelectedSupplier(null);
    setPurchaseForm(emptyPurchaseForm);
  };

  const closePayDueModal = () => {
    setIsPayDueOpen(false);
    setPayDueAmount("");
    setSelectedSupplier(null);
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search suppliers by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors text-white shadow-sm"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-48 appearance-none pl-4 pr-10 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-bold text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="name">Sort by Name</option>
            <option value="totalPurchased">Sort by Total Purchased</option>
            <option value="totalDue">Sort by Total Due</option>
          </select>
          <ArrowUpDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={14}
          />
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-4 py-2.5 bg-[#111113] border border-slate-800 rounded-xl text-sm font-bold text-slate-300 hover:border-indigo-500 transition-colors"
        >
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="panel-tech rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase font-bold">Suppliers</p>
          <p className="text-2xl font-black mt-1">{supplierStats.totalSuppliers}</p>
        </div>
        <div className="panel-tech rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase font-bold">With Due</p>
          <p className="text-2xl font-black mt-1 text-rose-400">
            {supplierStats.payableSuppliers}
          </p>
        </div>
        <div className="panel-tech rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase font-bold">Total Purchased</p>
          <p className="text-2xl font-black mt-1 text-emerald-400">
            {formatCurrency(supplierStats.totalPurchased)}
          </p>
        </div>
        <div className="panel-tech rounded-2xl p-4">
          <p className="text-xs text-slate-500 uppercase font-bold">Outstanding Due</p>
          <p className="text-2xl font-black mt-1 text-rose-400">
            {formatCurrency(supplierStats.totalDue)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading...</div>
      ) : filteredAndSortedSuppliers.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Truck size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">No Suppliers Found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedSuppliers.map((supplier) => (
            <div
              key={supplier._id}
              className="panel-tech rounded-2xl overflow-hidden"
            >
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
                      {formatCurrency(supplier.totalPurchased)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold">Due</p>
                    <p
                      className={`font-black ${supplier.totalDue > 0 ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {formatCurrency(supplier.totalDue)}
                    </p>
                  </div>
                  {supplier.totalDue > 0 && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setPayDueAmount(""); // Reset amount
                          setIsPayDueOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700"
                        title="Record Payment for Due Amount"
                      >
                        <Wallet size={16} /> Pay Due
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setPurchaseForm(emptyPurchaseForm);
                      setIsPurchaseOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700"
                  >
                    <ShoppingBag size={16} /> New Purchase
                  </button>
                  <button
                    onClick={() => openEditDrawer(supplier)}
                    className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded-lg transition-colors"
                    title="Edit Supplier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(supplier._id)}
                    className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg transition-colors"
                    title="Delete Supplier"
                  >
                    <Trash2 size={16} />
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
                              {formatCurrency(purchase.totalAmount)}
                            </p>
                            {purchase.totalAmount > purchase.amountPaid && (
                              <p className="text-xs text-rose-400">
                                Due: {formatCurrency(purchase.totalAmount - purchase.amountPaid)}
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
            onClick={resetForm}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-96 panel-tech border-l p-6 pb-24 z-50 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">
                {form._id ? "Edit Supplier" : "Add Supplier"}
              </h2>
              <button onClick={resetForm}>
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
                  onClick={resetForm}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting
                    ? form._id
                      ? "Updating..."
                      : "Adding..."
                    : form._id
                      ? "Update Supplier"
                      : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isPayDueOpen && selectedSupplier && (
        <>
          <div
            onClick={closePayDueModal}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm panel-tech p-6 rounded-2xl shadow-2xl z-50">
            <h2 className="text-xl font-black text-white mb-4">Record Payment</h2>
            <p className="text-sm text-slate-400 mb-4">
              Paying <span className="font-bold text-white">{selectedSupplier.name}</span>.
              Current due: <span className="font-bold text-rose-400">{formatCurrency(selectedSupplier.totalDue)}</span>
            </p>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
              Amount to Pay
            </label>
            <input
              type="number"
              value={payDueAmount}
              onChange={(e) => setPayDueAmount(e.target.value)}
              placeholder={`Max: ${formatCurrency(selectedSupplier.totalDue)}`}
              min="0"
              max={Number(selectedSupplier.totalDue || 0)}
              className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={closePayDueModal}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handlePayDue}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </>
      )}


      {isPurchaseOpen && selectedSupplier && (
        <>
          <div
            onClick={closePurchaseModal}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-[32rem] panel-tech border-l p-6 pb-24 z-50 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black">New Purchase</h2>
                <p className="text-sm text-slate-400">
                  from {selectedSupplier.name}
                </p>
              </div>
              <button onClick={closePurchaseModal}>
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
                    <button
                      type="button"
                      onClick={() => removePurchaseRow(idx)}
                      disabled={purchaseForm.items.length === 1}
                      className="col-span-2 justify-self-end text-xs text-rose-400 hover:text-rose-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                    >
                      Remove row
                    </button>
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
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional note for this purchase"
                  value={purchaseForm.notes}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none resize-none"
                />
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 space-y-1">
                <p className="text-sm text-slate-300 flex items-center justify-between">
                  <span>Total</span>
                  <span className="font-bold">{formatCurrency(purchasePreview.total)}</span>
                </p>
                <p className="text-sm text-slate-300 flex items-center justify-between">
                  <span>Paid</span>
                  <span className="font-bold">{formatCurrency(purchasePreview.paid)}</span>
                </p>
                <p className="text-sm text-rose-300 flex items-center justify-between">
                  <span>Due Added</span>
                  <span className="font-bold">{formatCurrency(purchasePreview.due)}</span>
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closePurchaseModal}
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
