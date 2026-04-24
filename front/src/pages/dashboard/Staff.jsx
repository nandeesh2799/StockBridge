import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  UserCog,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getStaff,
  addStaff,
  updateStaff,
  removeStaff,
} from "../../api/auth.api";

const ROLES = ["cashier", "manager"];

const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "cashier",
    pin: "",
    permissions: {
      canAccessPOS: true,
      canAccessInventory: false,
      canAccessReports: false,
      canAccessKhata: false,
      canAccessExpenses: false,
    },
  });

  const fetchStaff = async () => {
    try {
      const res = await getStaff();
      setStaffList(res.data || []);
    } catch {
      toast.error("Failed to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddDrawer = () => {
    setEditingStaff(null);
    setForm({
      name: "",
      phone: "",
      role: "cashier",
      pin: "",
      permissions: {
        canAccessPOS: true,
        canAccessInventory: false,
        canAccessReports: false,
        canAccessKhata: false,
        canAccessExpenses: false,
      },
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (staff) => {
    setEditingStaff(staff);
    setForm({
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      pin: "",
      permissions: staff.permissions || {},
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone)
      return toast.error("Name and phone are required.");
    if (!editingStaff && (!form.pin || form.pin.length < 4))
      return toast.error("PIN must be at least 4 digits.");
    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const payload = {
          name: form.name,
          role: form.role,
          permissions: form.permissions,
        };
        if (form.pin) payload.pin = form.pin;
        const res = await updateStaff(editingStaff._id, payload);
        setStaffList((prev) =>
          prev.map((s) => (s._id === editingStaff._id ? res.data : s)),
        );
        toast.success("Staff updated successfully!");
      } else {
        const res = await addStaff(form);
        setStaffList((prev) => [res.data, ...prev]);
        toast.success(`${form.name} added as ${form.role}!`);
      }
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save staff details.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      const res = await updateStaff(staff._id, { isActive: !staff.isActive });
      setStaffList((prev) =>
        prev.map((s) => (s._id === staff._id ? res.data : s)),
      );
      toast.success(
        `${staff.name} ${!staff.isActive ? "activated" : "deactivated"}.`,
      );
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      await removeStaff(id);
      setStaffList((prev) => prev.filter((s) => s._id !== id));
      toast.success("Staff removed successfully.");
    } catch {
      toast.error("Failed to remove staff.");
    }
  };

  const PERMISSIONS = [
    { key: "canAccessPOS", label: "POS" },
    { key: "canAccessInventory", label: "Inventory" },
    { key: "canAccessReports", label: "Reports" },
    { key: "canAccessKhata", label: "Khata" },
    { key: "canAccessExpenses", label: "Expenses" },
  ];

  return (
    <div className="text-white space-y-6 min-h-screen pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Staff Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Add cashiers and managers with custom permissions.
          </p>
        </div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">Loading...</div>
      ) : staffList.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <UserCog size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">No Staff Members Found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {staffList.map((staff) => (
            <div key={staff._id} className="panel-tech rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-black flex items-center justify-center text-sm">
                    {staff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{staff.name}</p>
                    <p className="text-xs text-slate-400">{staff.phone}</p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${staff.role === "manager" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}`}
                >
                  {staff.role}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {PERMISSIONS.map(({ key, label }) => (
                  <span
                    key={key}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md ${staff.permissions?.[key] ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-600"}`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-4">
                <div className="flex items-center gap-1.5">
                  {staff.isActive ? (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="text-rose-400 text-xs font-bold flex items-center gap-1">
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(staff)}
                    className={`p-2 text-xs font-bold rounded-lg ${staff.isActive ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}
                  >
                    {staff.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openEditDrawer(staff)}
                    className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(staff._id)}
                    className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
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
              <h2 className="text-xl font-black">
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h2>
              <button onClick={() => setIsDrawerOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Staff member name"
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>
              {!editingStaff && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="10-digit number"
                    className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">
                  {editingStaff
                    ? "New PIN (leave blank to keep)"
                    : "PIN (min 4 digits)"}
                </label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) =>
                    setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="••••"
                  maxLength={6}
                  className="w-full p-3 bg-[#111113] border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 tracking-widest text-center text-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">
                  Permissions
                </label>
                <div className="space-y-2">
                  {PERMISSIONS.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800"
                    >
                      <span className="text-sm font-bold text-slate-300">
                        Access {label}
                      </span>
                      <input
                        type="checkbox"
                        checked={form.permissions[key] || false}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingStaff
                      ? "Update"
                      : "Add Staff"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Staff;
