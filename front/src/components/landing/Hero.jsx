import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

// Animated mock dashboard card
const MockDashboard = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    {/* Glow effect */}
    <div className="absolute inset-0 bg-indigo-600/20 blur-3xl rounded-3xl" />

    <div className="relative bg-[#111113] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/80 bg-[#09090b]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            StockBridge Dashboard
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-400">LIVE</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-slate-800/40 border-b border-slate-800/60">
        {[
          {
            label: "Today's Revenue",
            value: "₹12,840",
            color: "text-indigo-400",
            change: "+18%",
          },
          {
            label: "Profit",
            value: "₹3,650",
            color: "text-emerald-400",
            change: "+12%",
          },
          {
            label: "Credit",
            value: "₹4,200",
            color: "text-rose-400",
            change: "-6%",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111113] p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              {stat.change} today
            </p>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Revenue vs Profit
          </p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[9px] text-slate-500">Revenue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-slate-500">Profit</span>
            </div>
          </div>
        </div>
        {/* Fake chart bars */}
        <div className="flex items-end gap-1.5 h-20">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 65, 92].map(
            (h, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col gap-0.5 items-center"
              >
                <div
                  className="w-full rounded-t-sm opacity-80"
                  style={{
                    height: `${h}%`,
                    background:
                      i % 2 === 0
                        ? "linear-gradient(to top, #4f46e5, #6366f1)"
                        : "linear-gradient(to top, #059669, #10b981)",
                  }}
                />
              </div>
            ),
          )}
        </div>
        <div className="flex justify-between mt-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="text-[8px] text-slate-600 font-bold">
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom list - recent sales */}
      <div className="border-t border-slate-800/60 px-4 pb-4 pt-3">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
          Recent Transactions
        </p>
        {[
          {
            name: "Ramesh Kumar",
            amount: "₹850",
            method: "Cash",
            time: "2m ago",
          },
          { name: "Walk-in", amount: "₹1,240", method: "UPI", time: "15m ago" },
          {
            name: "Suresh Sharma",
            amount: "₹320",
            method: "Credit",
            time: "1h ago",
          },
        ].map((tx, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-indigo-400">
                {tx.name[0]}
              </div>
              <div>
                <p className="text-[9px] font-bold text-white leading-tight">
                  {tx.name}
                </p>
                <p className="text-[8px] text-slate-600">{tx.time}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-white">{tx.amount}</p>
              <p
                className={`text-[8px] font-bold ${tx.method === "Credit" ? "text-rose-400" : tx.method === "UPI" ? "text-indigo-400" : "text-emerald-400"}`}
              >
                {tx.method}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

function Hero() {
  const navigate = useNavigate();
  const token = localStorage.getItem("retailflow_token");

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center bg-[#09090b] overflow-hidden pt-20"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                Built for Indian Retailers
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none">
                Run your
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-violet-400">
                  Shop
                </span>
                <br />
                smarter.
              </h1>
              <p className="text-lg text-slate-400 max-w-md font-medium leading-relaxed pt-2">
                POS billing, digital khata, inventory tracking and profit
                analytics — all in one place. No more notebooks.
              </p>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-6">
              {[
                { icon: Zap, label: "Instant billing" },
                { icon: Shield, label: "Encrypted & secure" },
                { icon: TrendingUp, label: "Real-time analytics" },
              // eslint-disable-next-line no-unused-vars
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={13} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-400">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              {token ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-4 rounded-xl font-black transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                >
                  Go to Dashboard
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signup")}
                    className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-4 rounded-xl font-black transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                  >
                    Start for free
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-7 py-4 rounded-xl font-black transition-all active:scale-95"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            
          </div>

          {/* Right — Mock Dashboard */}
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}

export default Hero;
