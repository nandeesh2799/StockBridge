import Analytics from "../../assets/Images/Analytics.png";
import { useNavigate } from "react-router-dom";

function DashboardPreview() {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-[#09090b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16">
        {/* Image Side */}
        <div className="flex-1 w-full">
          <div className="bg-[#171e2e] border border-slate-800 shadow-2xl rounded-3xl p-3 sm:p-6">
            <img
              src={Analytics}
              alt="Analytics Preview"
              className="rounded-2xl w-full h-auto border border-slate-700/50"
            />
          </div>
        </div>

        {/* Text Side */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            See Your Business Clearly
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-medium">
            Monitor sales, profit, inventory value and top selling items with
            clean visual analytics designed for modern retailers.
          </p>

          <div className="pt-4 flex justify-center lg:justify-start">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl transition duration-200 font-bold shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              Explore Dashboard
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPreview;
