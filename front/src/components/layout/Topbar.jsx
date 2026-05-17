import { Menu, WifiOff } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

const Topbar = ({ setSidebarOpen }) => {
  const { t } = useTranslation();
  const [initials, setInitials] = useState("SB");
  const [shopName, setShopName] = useState("");
  const [userAvatar, setUserAvatar] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

  const getPageTitle = (path) => {
    const map = {
      "/dashboard": t("common.dashboard"),
      "/dashboard/pos": t("common.pos"),
      "/dashboard/inventory": t("common.inventory"),
      "/dashboard/stock-adjustment": t("common.stockAdjustment"),
      "/dashboard/khata": t("khata.title"),
      "/dashboard/reports": t("common.reports"),
      "/dashboard/ai-chat": t("common.aiAssistant"),
      "/dashboard/settings": t("common.settings"),
      "/dashboard/profile": t("settings.profile"),
      "/dashboard/expenses": t("common.expenses"),
      "/dashboard/suppliers": t("common.suppliers"),
      "/dashboard/staff": t("common.staff"),
    };
    if (map[path]) return map[path];
    for (const [key, val] of Object.entries(map)) {
      if (path.startsWith(key) && key !== "/dashboard") return val;
    }
    return t("common.dashboard");
  };

  const currentPage = getPageTitle(location.pathname);

  const syncData = () => {
    const savedShop = localStorage.getItem("retailflow_shop");
    if (savedShop) {
      try {
        const parsed = JSON.parse(savedShop);
        const name = parsed.shopName || parsed.name || "StockBridge";
        setShopName(name);
        setInitials(name.substring(0, 2).toUpperCase());
        setUserAvatar(parsed.logo || parsed.avatar || null);
      } catch (e) {
        console.error("Failed to parse shop data", e);
      }
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener("profileUpdated", syncData);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("profileUpdated", syncData);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="h-16 border-b border-slate-800 bg-[#09090b] flex items-center justify-between px-4 md:px-6 z-30 sticky top-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          className="md:hidden p-2 bg-slate-800 text-slate-300 rounded-xl shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 overflow-hidden">
          <h1 className="text-base md:text-lg font-bold text-white tracking-tight truncate max-w-50 sm:max-w-md">
            {shopName || "My Store"}
          </h1>
          <span className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-widest hidden sm:block">
            | {currentPage}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        
        {!isOnline ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20">
            <WifiOff size={12} className="text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              {t("common.offline") || "Offline"}
            </span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {"Live"}
            </span>
          </div>
        )}

        <Link
          to="/dashboard/profile"
          className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold hover:scale-105 transition-all overflow-hidden shadow-sm"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </Link>
      </div>
    </div>
  );
};

export default Topbar;
