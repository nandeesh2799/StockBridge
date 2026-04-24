import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Wallet, X } from "lucide-react";
import API from "../../api/axiosInstance";

const CATEGORIES = [
  "Rent",
  "Salary",
  "Electricity",
  "Transport",
  "Maintenance",
  "Marketing",
  "Purchase",
  "Other",
];
const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Other"];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [byCategory, setByCategory] = useState({});
  const [form, setForm] = useState({
    category: "Rent",
    amount: "",
    description: "",
    date: "",
    paymentMethod: "Cash",
  });

  const fetchExpenses = async () => {
    try {
      const res = await API.get("/expenses");
      setExpenses(res.data.data || []);
      setTotalAmount(res.data.totalAmount || 0);
      setByCategory(res.data.byCategory || {});
    } catch {
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAdd = async () => {
    if (!form.amount || Number(form.amount) <= 0)
      return toast.error("Enter a valid amount.");
    setIsSubmitting(true);
    try {
      const res = await API.post("/expenses", form);
      setExpenses((prev) => [res.data.data, ...prev]);
      setTotalAmount((prev) => prev + Number(form.amount));
      setByCategory((prev) => ({
        ...prev,
        [form.category]: (prev[form.category] || 0) + Number(form.amount),
      }));
      toast.success("Expense recorded!");
      setForm({
        category: "Rent",
        amount: "",
        description: "",
        date: "",
        paymentMethod: "Cash",
      });
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, amount, category) => {
    try {
      await API.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      setTotalAmount((prev) => prev - amount);
      setByCategory((prev) => ({
        ...prev,
        [category]: Math.max(0, (prev[category] || 0) - amount),
      }));
      toast.success("Expense deleted.");
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  const categoryColors = {
    Rent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    Salary: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    Electricity: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Transport: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    Maintenance: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    Marketing: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    Purchase: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Other: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };

  return (
    <div className="text-white space-y-6 bg-transparent min-h-screen pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Expense Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track all business costs for accurate net profit.
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="panel-tech rounded-2xl p-5 col-span-1 sm:col-span-2 xl:col-span-1">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">
            Total Expenses
          </p>
          <p className="text-3xl font-black text-rose-400">
            ₹{new Intl.NumberFormat("en-IN").format(totalAmount)}
          </p>
        </div>
        {Object.entries(byCategory)
          .slice(0, 3)
          .map(([cat, amt]) => (
            <div
              key={cat}
              className="panel-tech rounded-2xl p-5"
            >
              <p className="text-slate-400 text-xs font-bold uppercase mb-1">
                {cat}
              </p>
              <p className="text-2xl font-black text-white">
                ₹{new Intl.NumberFormat("en-IN").format(amt)}
              </p>
            </div>
          ))}
      </div>

      <div className="panel-tech rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Wallet size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">No Expenses Recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {expenses.map((expense) => (
              <div
                key={expense._id}
                className="p-4 flex items-center justify-between hover:bg-slate-800/20"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryColors[expense.category] || categoryColors.Other}`}
                  >
                    {expense.category}
                  </span>
                  <div>
                    <p className="font-bold text-white">
                      {expense.description || expense.category}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(expense.date).toLocaleDateString("en-IN")} ·{" "}
                      {expense.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-rose-400 text-lg">
                    ₹{new Intl.NumberFormat("en-IN").format(expense.amount)}
                  </p>
                  <button
                    onClick={() =>
                      handleDelete(
                        expense._id,
                        expense.amount,
                        expense.category,
                      )
                    }
                    className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <>
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
          <div className="fixed top-0 right-0 h-dvh w-full sm:w-96 panel-tech border-l p-6 pb-24 z-50 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white">Add Expense</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Amount
                </label>
                <input
                  type="number"
                  placeholder="₹ 0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly office rent"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Payment Method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Expenses;
