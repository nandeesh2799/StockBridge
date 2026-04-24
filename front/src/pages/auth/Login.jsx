import { useState, useEffect } from "react";
import {
  Mail,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  Phone,
  Lock,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  sendLoginOtp,
  verifyLoginOtp,
  staffLogin,
  loginWithPassword,
  forgotPassword,
  resetPassword,
} from "../../api/auth.api";
import Navbar from "../../components/layout/Navbar";

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loginType, setLoginType] = useState("owner");
  const [ownerMethod, setOwnerMethod] = useState("password");
  const [contactMethod, setContactMethod] = useState("email");
  const [contactValue, setContactValue] = useState("");
  const [otp, setOtp] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("retailflow_token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  const isValidContact = () => {
    if (contactMethod === "email")
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue);
    return contactValue.length === 10 && /^\d+$/.test(contactValue);
  };

  const isOtpValid = otp.length === 6 && /^\d+$/.test(otp);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Email and password required.");
    setLoading(true);
    try {
      const res = await loginWithPassword({ email, password });
      if (res.token) {
        localStorage.setItem("retailflow_token", res.token);
        localStorage.setItem("retailflow_shop", JSON.stringify(res.data));
        localStorage.setItem("retailflow_role", "owner");
        toast.success("Welcome back to StockBridge!");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!isValidContact())
      return toast.error(`Enter a valid ${contactMethod}.`);
    setLoading(true);
    try {
      await sendLoginOtp({ contactMethod, contactValue });
      toast.success(`OTP sent to your ${contactMethod}!`);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!isOtpValid) return toast.error("Enter a valid 6-digit OTP.");
    setLoading(true);
    try {
      const res = await verifyLoginOtp({ contactMethod, contactValue, otp });
      if (res.token) {
        localStorage.setItem("retailflow_token", res.token);
        localStorage.setItem("retailflow_shop", JSON.stringify(res.data));
        localStorage.setItem("retailflow_role", "owner");
        toast.success("Welcome back to StockBridge!");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!staffPhone || !staffPin)
      return toast.error("Phone and PIN are required.");
    setLoading(true);
    try {
      const res = await staffLogin({ phone: staffPhone, pin: staffPin });
      if (res.token) {
        localStorage.setItem("retailflow_token", res.token);
        localStorage.setItem("retailflow_shop", JSON.stringify(res.data));
        localStorage.setItem("retailflow_role", res.data.role);
        toast.success(`Welcome, ${res.data.name}!`);
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail))
      return toast.error("Enter a valid email address.");
    setLoading(true);
    try {
      await forgotPassword({ email: forgotEmail });
      toast.success("Password reset OTP sent! Check terminal/email.");
      setForgotStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6)
      return toast.error("Enter a valid 6-digit OTP.");
    if (!newPassword || newPassword.length < 6)
      return toast.error("Password must be at least 6 characters.");
    if (newPassword !== confirmNewPassword)
      return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await resetPassword({ email: forgotEmail, otp: forgotOtp, newPassword });
      toast.success("Password reset successfully! Please login.");
      setShowForgot(false);
      setForgotStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD SCREEN
  if (showForgot) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center bg-[#09090b] justify-center px-4 pt-20">
          <div className="bg-[#111113] border w-full max-w-md p-8 shadow-2xl border-slate-800 rounded-3xl">
            <button
              onClick={() => {
                setShowForgot(false);
                setForgotStep(1);
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft size={18} /> Back to Login
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white">
                {forgotStep === 1 ? "Forgot Password" : "Reset Password"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {forgotStep === 1
                  ? "Enter your email to receive OTP"
                  : "Enter OTP and new password"}
              </p>
            </div>

            {forgotStep === 1 ? (
              <form className="space-y-4" onSubmit={handleForgotSendOtp}>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Your registered email"
                  className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !forgotEmail}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      <Mail size={18} /> Send Reset OTP
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength="6"
                    value={forgotOtp}
                    onChange={(e) =>
                      setForgotOtp(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••••"
                    className="w-full text-center tracking-[1em] px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white text-xl font-black focus:outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </>
    );
  }

  // MAIN LOGIN SCREEN
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center bg-[#09090b] justify-center px-4 pt-20">
        <div className="bg-[#111113] border w-full max-w-md p-8 shadow-2xl border-slate-800 rounded-3xl">
          {/* Owner / Staff Toggle */}
          <div className="flex p-1 bg-[#09090b] rounded-xl border border-slate-800 mb-6">
            <button
              onClick={() => {
                setLoginType("owner");
                setStep(1);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginType === "owner" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              {"OwnerLogin"}
            </button>
            <button
              onClick={() => setLoginType("staff")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginType === "staff" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              {"Staff Login"}
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">
              {loginType === "staff"
                ? "Staff Access"
                : step === 2
                  ? "Verify Otp"
                  : "StockBridge Login"}
            </h2>
          </div>

          {/* STAFF LOGIN */}
          {loginType === "staff" && (
            <form className="space-y-5" onSubmit={handleStaffLogin}>
              <input
                type="tel"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                placeholder="10-digit phone number"
                className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <input
                type="password"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter your PIN"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium tracking-widest text-center text-xl"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Verifying" : "Login As Staff"}
              </button>
            </form>
          )}

          {/* OWNER LOGIN - STEP 1 */}
          {loginType === "owner" && step === 1 && (
            <>
              {/* Password / OTP Toggle */}
              <div className="flex p-1 bg-[#09090b] rounded-xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setOwnerMethod("password")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${ownerMethod === "password" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  <Lock size={14} /> Password
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerMethod("otp")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${ownerMethod === "otp" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  <Mail size={14} /> OTP
                </button>
              </div>

              {/* PASSWORD FORM */}
              {ownerMethod === "password" && (
                <form className="space-y-4" onSubmit={handlePasswordLogin}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your registered email"
                    className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                    autoFocus
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!email || !password || loading}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all ${email && password && !loading ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                  >
                    {loading ? (
                      "Logging in..."
                    ) : (
                      <>
                        Login <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </form>
              )}

              {/* OTP FORM */}
              {ownerMethod === "otp" && (
                <form className="space-y-4" onSubmit={handleSendOtp}>
                  <div className="flex p-1 bg-[#09090b] rounded-xl border border-slate-800">
                    {["email", "phone"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setContactMethod(method);
                          setContactValue("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${contactMethod === method ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                      >
                        {method === "email" ? (
                          <Mail size={16} />
                        ) : (
                          <Phone size={16} />
                        )}
                        {method === "email" ? "Email" : "Mobile"}
                      </button>
                    ))}
                  </div>
                  <input
                    type={contactMethod === "email" ? "email" : "tel"}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder={
                      contactMethod === "email"
                        ? "Your registered email"
                        : "10-digit mobile number"
                    }
                    className="w-full px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!isValidContact() || loading}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all ${isValidContact() && !loading ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                  >
                    {loading ? (
                      "Sending Otp"
                    ) : (
                      <>
                        {"Get Otp"} <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* OTP VERIFY - STEP 2 */}
          {loginType === "owner" && step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-400 font-bold mb-3 justify-center uppercase tracking-widest">
                  <KeyRound size={16} className="text-indigo-400" /> 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[1em] px-4 py-4 rounded-xl bg-[#09090b] border border-slate-700 text-white text-xl font-black focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  type="submit"
                  disabled={!isOtpValid || loading}
                  className={`flex-1 py-4 rounded-xl font-black transition-all ${isOtpValid && !loading ? "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                >
                  {loading ? "Verifying" : "Verify & Login"}
                </button>
              </div>
            </form>
          )}

          {step === 1 && loginType === "owner" && (
            <p className="text-center text-sm font-bold text-slate-500 mt-8">
              {"New To Retailflow"}
              <Link
                to="/signup"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {"Create Account"}
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
