import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Public Pages
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import Navbar from "./components/layout/Navbar";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Inventory from "./pages/dashboard/Inventory";
import POS from "./pages/dashboard/POS";
import Invoice from "./pages/dashboard/Invoice";
import Settings from "./pages/dashboard/Settings";
import Khata from "./pages/dashboard/Khata";
import Reports from "./pages/dashboard/Reports";
import StockAdjustment from "./pages/dashboard/StockAdjustment";
import Profile from "./pages/dashboard/Profile";
import Expenses from "./pages/dashboard/Expenses";
import Suppliers from "./pages/dashboard/Suppliers";
import Staff from "./pages/dashboard/Staff";
import AIChat from "./pages/AIChat";


const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("retailflow_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
    <div className="min-h-screen w-full bg-[#09090b] text-white">
      <Toaster richColors position="top-right" theme="dark" />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <LandingPage />
            </>
          }
        />

        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="khata" element={<Khata />} />
          <Route path="pos" element={<POS />} />
          <Route path="invoice/:id" element={<Invoice />} />
          <Route path="settings" element={<Settings />} />
          <Route path="stock-adjustment" element={<StockAdjustment />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="staff" element={<Staff />} />
          <Route path="ai-chat" element={<AIChat />} />

        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
