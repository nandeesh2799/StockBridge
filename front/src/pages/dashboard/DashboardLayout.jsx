import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import API from "../../api/axiosInstance";
import { toast } from "sonner";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopProfile, setShopProfile] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [itemsRes, custRes, salesRes] = await Promise.all([
          API.get("/items").catch(() => ({ data: { data: [] } })),
          API.get("/customers").catch(() => ({ data: { data: [] } })),
          API.get("/sales").catch(() => ({ data: { data: [] } })),
        ]);

        setItems(itemsRes.data.data || []);
        setCustomers(custRes.data.data || []);
        setSales(salesRes.data.data || []);

        const savedShop = localStorage.getItem("retailflow_shop");
        if (savedShop) {
          try {
            setShopProfile(JSON.parse(savedShop));
          } catch {
            // corrupted data — clear and redirect
            localStorage.removeItem("retailflow_shop");
            localStorage.removeItem("retailflow_token");
            navigate("/login");
          }
        }
      } catch (error) {
        // 401 is handled by axios interceptor — other errors show toast
        if (error.response?.status !== 401) {
          toast.error("Failed to sync data. Check your connection.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [navigate]);

  // Profile update handler — keeps shopProfile in sync with localStorage
  const handleSetShopProfile = (data) => {
    setShopProfile(data);
    localStorage.setItem("retailflow_shop", JSON.stringify(data));
    window.dispatchEvent(new Event("profileUpdated"));
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-slate-400 tracking-widest uppercase text-sm">
          Syncing StockBridge...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-white">

  {/* Sidebar */}
  <div className="h-full print:hidden">
    <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
  </div>

  {/* Main Section */}
  <div className="flex-1 flex flex-col h-full">

    {/* Topbar */}
    <div className="print:hidden shrink-0">
      <Topbar setSidebarOpen={setSidebarOpen} />
    </div>

    {/* Page Content */}
    <main className="flex-1 overflow-hidden bg-[#09090b]">
      
      {/* IMPORTANT WRAPPER */}
      <div className="h-full w-full overflow-y-auto p-4 md:p-6">
        <Outlet
          context={{
            items,
            setItems,
            sales,
            setSales,
            shopProfile,
            setShopProfile: handleSetShopProfile,
            customers,
            setCustomers,
          }}
        />
      </div>

    </main>
  </div>
</div>
  );
};

export default DashboardLayout;
