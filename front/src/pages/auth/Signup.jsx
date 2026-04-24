import { useState } from "react";
import { User, Mail, Store, Phone, UserRoundKey } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerShop } from "../../api/auth.api";
import Navbar from "../../components/layout/Navbar"; 

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    shopName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return "";
    const hasNumber = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    if (pwd.length < 6) return "Weak";
    if (pwd.length >= 6 && (!hasNumber || !hasLetter)) return "Medium";
    if (pwd.length >= 8 && hasNumber && hasLetter) return "Strong";
    return "Medium";
  };

  const strength = getPasswordStrength();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.fullName.trim())
      newErrors.fullName = "Full Name is required!";
    if (!formData.shopName.trim())
      newErrors.shopName = "Shop Name is required!";
    if (!emailRegex.test(formData.email))
      newErrors.email = "Enter a valid email";
    if (formData.phone.length !== 10)
      newErrors.phone = "Enter a valid 10-digit phone number!";
    if (strength === "Weak") newErrors.password = "Password is too weak";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validateErrors = validateForm();
    if (Object.keys(validateErrors).length > 0) {
      setError(validateErrors);
      return;
    }

    setError({});
    setLoading(true);

    try {
      const res = await registerShop({
        ownerName: formData.fullName,
        shopName: formData.shopName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      if (res.success) {
        toast.success("Dukaan Registered Successfully! Please Login. 🎉");
        navigate("/login");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Registration failed!";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.fullName.trim() &&
    formData.shopName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.phone.length === 10 &&
    strength !== "Weak" &&
    formData.password === formData.confirmPassword;

  return (
    <>
      <Navbar /> {/* 👈 Navbar added */}
      <div className="min-h-screen flex items-center bg-[#09090b] justify-center px-4 py-10 pt-28">
        {" "}
        <div className="bg-white/5 border w-full max-w-md backdrop-blur-md p-8 shadow-lg shadow-black/30 border-white/10 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Create Your Store</h2>
            <p className="text-white/60 mt-2 text-sm">
              Start managing inventory and billing in minutes.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <User size={18} /> Full Name
              </label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                type="text"
                placeholder="Enter Full Name"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {error.fullName && (
                <p className="text-red-400 text-sm mt-1">{error.fullName}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <Store size={18} /> Shop Name
              </label>
              <input
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                type="text"
                placeholder="Enter shop name"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {error.shopName && (
                <p className="text-red-400 text-sm mt-1">{error.shopName}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <Mail size={18} /> Email Address
              </label>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="Enter Email"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {error.email && (
                <p className="text-red-400 text-sm mt-1">{error.email}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <Phone size={18} /> Phone Number
              </label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                type="tel"
                placeholder="10-digit number"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {error.phone && (
                <p className="text-red-400 text-sm mt-1">{error.phone}</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <UserRoundKey size={18} /> Password
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {formData.password && (
                <p
                  className={`text-sm mt-1 ${strength === "Weak" ? "text-red-400" : strength === "Medium" ? "text-amber-400" : "text-emerald-400"}`}
                >
                  Strength: {strength}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                <UserRoundKey size={18} /> Confirm Password
              </label>
              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              />
              {error.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {error.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-3 mt-4 rounded-lg font-bold transition duration-200 ${isFormValid && !loading ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <p className="text-center text-sm text-white/60 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Log In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default Signup;
