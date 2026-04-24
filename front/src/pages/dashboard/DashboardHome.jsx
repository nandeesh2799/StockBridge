import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Package,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import API from "../../api/axiosInstance";

const StatCard = ({ label, value, sub, color = "indigo", icon: Icon }) => {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className="panel-tech rounded-2xl p-5 flex flex-col justify-between min-h-27.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        {Icon && (
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-black ${colors[color].split(" ")[0]}`}>
          {value}
        </p>
        {sub && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
};

const AiInsightText = ({ text, isError }) => {
  if (isError)
    return <p className="text-sm text-rose-400 font-medium">{text}</p>;
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="space-y-2">
      {sentences.map((sentence, i) => (
        <p
          key={i}
          className="text-sm text-slate-300 leading-relaxed font-medium"
        >
          {i === 0 ? (
            <span>
              <span className="text-indigo-400 font-black">→ </span>
              {sentence}
            </span>
          ) : (
            <span className="text-slate-400">{sentence}</span>
          )}
        </p>
      ))}
    </div>
  );
};

const DashboardHome = () => {
  const { items, sales, customers } = useOutletContext();

  const [dashStats, setDashStats] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get("/reports/dashboard");
        setDashStats(res.data.data);
        // eslint-disable-next-line no-empty
      } catch {}
    };
    fetchStats();
  }, []);

  const chartData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const daySales = sales.filter((s) => {
        const sd = new Date(s.createdAt);
        return sd >= dayStart && sd <= dayEnd;
      });
      days.push({
        day: label,
        Revenue: Math.round(
          daySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
        ),
        Profit: Math.round(
          daySales.reduce((sum, s) => sum + (s.profit || 0), 0),
        ),
      });
    }
    return days;
  })();

  const todayRevenue = dashStats?.todaysRevenue ?? chartData[6]?.Revenue ?? 0;
  const todayProfit = dashStats?.todaysProfit ?? chartData[6]?.Profit ?? 0;
  const totalCredit =
    dashStats?.totalCredit ??
    customers.reduce((s, c) => s + (c.totalCredit || 0), 0);

  const lowStockItems = items.filter((item) => {
    const qty = item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
    return qty <= (item.alertQuantity || 5) && qty > 0;
  });

  const topSelling = (() => {
    const freq = {};
    sales.forEach((sale) => {
      sale.items?.forEach((i) => {
        const key = i.name || i.itemId;
        if (!freq[key])
          freq[key] = { name: i.name || "Unknown", qty: 0, revenue: 0 };
        freq[key].qty += i.quantity || 0;
        freq[key].revenue += (i.sellingPrice || 0) * (i.quantity || 0);
      });
    });
    return Object.values(freq)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  })();

  const dueCustomers = customers
    .filter((c) => c.totalCredit > 0)
    .sort((a, b) => b.totalCredit - a.totalCredit)
    .slice(0, 5);

  const fetchAiInsight = useCallback(async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const summary = {
        todayRevenue,
        todayProfit,
        totalCredit,
        topItems: topSelling.slice(0, 3).map((i) => i.name),
        lowStockCount: lowStockItems.length,
        totalItems: items.length,
        salesLast7: chartData.map((d) => ({ day: d.day, revenue: d.Revenue })),
        customerCount: customers.length,
        netProfit: dashStats?.netProfit,
      };

      const promptText = `You are an intelligent retail business advisor for StockBridge POS, assisting small and medium retail store owners with daily business decisions.

Analyze the shop data provided below and generate exactly 3 clear and professional sentences:

Sentence 1: Summarize today’s business performance using actual numbers from the data
Sentence 2: Identify the most important issue, risk, or growth opportunity at the moment
Sentence 3: Recommend one specific action the shop owner should take today

Strict rules:
- Plain text only
- No bullet points, no headings, no markdown, no symbols like * or #
- Exactly 3 sentences only
- Each sentence must be short, direct, and professional
- Always include real numbers from the provided data
- Use clear business English suitable for shop owners
- Focus on actionable and practical advice
- Do not use generic phrases like "As a business advisor" or "Let's analyze"
- Keep responses clear, concise, and professional
- Use Indian currency format (₹) when needed
- Answer only using the provided shop data context
- Refuse politely if the user asks unrelated non-shop information
- Never invent numbers that are not in the context

Shop data:
${JSON.stringify(summary, null, 2)}`;

      const response = await API.post("/ai/generate", { prompt: promptText });
      if (response.data && response.data.success) {
        setAiInsight(response.data.data);
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("AI Insight Fetch Error:", error);
      setAiError(true);
      if (error?.response?.status === 429) {
        setAiInsight(
          "AI quota exceeded. Please try again in a few minutes. ⏳",
        );
      } else {
        setAiInsight(
          // eslint-disable-next-line no-constant-binary-expression
          "Could Not Load AI" || "Could not load AI insight right now.",
        );
      }
    } finally {
      setAiLoading(false);
    }
  }, [
    todayRevenue,
    todayProfit,
    totalCredit,
    items.length,
    customers.length,
    topSelling,
    lowStockItems.length,
    chartData,
    dashStats,
  ]);

  useEffect(() => {
    if (items.length > 0 || sales.length > 0) fetchAiInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n) => `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={"Todays Revenue"}
          value={fmt(todayRevenue)}
          sub={"Sales Today"}
          color="indigo"
          icon={TrendingUp}
        />
        <StatCard
          label={"Todays Profit"}
          value={fmt(todayProfit)}
          sub={"After Purchase Cost"}
          color="emerald"
          icon={TrendingUp}
        />
        <StatCard
          label={"Total Credit"}
          value={fmt(totalCredit)}
          sub={`${dueCustomers.length} ${"Customers"}`}
          color="rose"
          icon={Users}
        />
        <StatCard
          label={"Low Stock"}
          value={lowStockItems.length}
          sub={"Items Near Alert"}
          color="amber"
          icon={AlertTriangle}
        />
      </div>

      {/* AI Insight Card */}
      <div className="panel-tech rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles size={14} className="text-indigo-400" />
            </div>
            <p className="font-black text-white text-sm">
              {"AI Business Insight"}
            </p>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {"Live"}
            </span>
          </div>
          <button
            onClick={fetchAiInsight}
            disabled={aiLoading}
            className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-40"
            title={"Refresh Insight"}
          >
            <RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />
          </button>
        </div>
        {aiLoading ? (
          <div className="space-y-2.5">
            <div className="h-3 bg-slate-800/80 rounded-full animate-pulse w-full" />
            <div className="h-3 bg-slate-800/80 rounded-full animate-pulse w-5/6" />
            <div className="h-3 bg-slate-800/80 rounded-full animate-pulse w-4/6" />
          </div>
        ) : (
          <AiInsightText
            text={aiInsight || "Analyzing Data"}
            isError={aiError}
          />
        )}
      </div>

      {/* Revenue & Profit Chart */}
      <div className="panel-tech rounded-2xl p-5 min-w-0 overflow-hidden">
        <h2 className="font-bold text-white mb-4">{"Revenue Vs Profit"}</h2>
        <div className="h-52 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#111113",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                formatter={(val) =>
                  `₹${new Intl.NumberFormat("en-IN").format(val)}`
                }
              />
              <Area
                type="monotone"
                dataKey="Revenue"
                stroke="#6366f1"
                fill="url(#revGrad)"
                strokeWidth={2}
                dot={{ fill: "#6366f1", r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="Profit"
                stroke="#10b981"
                fill="url(#profGrad)"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Selling */}
        <div className="panel-tech rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Package size={16} className="text-indigo-400" />{" "}
            {"Top Selling Items"}
          </h2>
          {topSelling.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              {"No Sales Yet"}
            </p>
          ) : (
            <div className="space-y-3">
              {topSelling.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-500 w-5">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {item.name}
                    </p>
                    <div className="h-1.5 bg-slate-800 rounded-full mt-1.5">
                      <div
                        className="h-1.5 bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (item.qty / (topSelling[0]?.qty || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-300">
                    {item.qty} {"Sold"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due Customers */}
        <div className="panel-tech rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-rose-400" />{" "}
            {"Top Credit Customers"}
          </h2>
          {dueCustomers.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              {"No Outstanding Credit"}
            </p>
          ) : (
            <div className="space-y-3">
              {dueCustomers.map((c) => (
                <div
                  key={c._id}
                className="flex items-center justify-between bg-slate-800/30 px-4 py-3 rounded-xl border border-slate-800/60"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-rose-400">
                      {fmt(c.totalCredit)}
                    </p>
                    {c.creditLimit > 0 && (
                      <p className="text-xs text-slate-500">
                        {"Limit"}: {fmt(c.creditLimit)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="panel-tech rounded-2xl p-5 border-amber-500/20">
          <h2 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} /> {"Low Stock Warning"} (
            {lowStockItems.length} {"Items"})
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {lowStockItems.slice(0, 6).map((item) => {
              const qty =
                item.batches?.reduce((s, b) => s + b.quantity, 0) || 0;
              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between bg-[#111113] px-4 py-3 rounded-xl border border-slate-800"
                >
                  <p className="text-sm font-bold text-white truncate">
                    {item.name}
                  </p>
                  <span className="text-xs font-black text-amber-400 ml-2 shrink-0">
                    {qty} {"Left"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
