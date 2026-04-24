/* eslint-disable no-unused-vars */
import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  TrendingUp,
  IndianRupee,
  Receipt,
  CreditCard,
  BarChart3,
} from "lucide-react";

const Reports = () => {
  const { t } = useTranslation();
  const { sales = [] } = useOutletContext();
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filteredSales = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = new Date();
    if (range === "7d") startDate.setDate(today.getDate() - 7);
    else if (range === "30d") startDate.setDate(today.getDate() - 30);
    else if (range === "6m") startDate.setMonth(today.getMonth() - 6);
    else if (range === "1y") startDate.setFullYear(today.getFullYear() - 1);
    else if (range === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return sales.filter((s) => {
        const d = new Date(s.createdAt || s.date);
        return d >= start && d <= end;
      });
    } else {
      startDate = new Date(0);
    }
    return sales.filter((s) => new Date(s.createdAt || s.date) >= startDate);
  }, [range, customStart, customEnd, sales]);

  const stats = useMemo(
    () =>
      filteredSales.reduce(
        (acc, sale) => {
          acc.revenue += Number(sale.totalAmount || 0);
          acc.profit += Number(sale.profit || 0);
          acc.gst += Number(sale.totalTax || 0);
          acc.credit += Number(
            sale.paymentSplit?.credit ?? sale.paymentSplit?.ucredit ?? 0,
          );
          return acc;
        },
        { revenue: 0, profit: 0, gst: 0, credit: 0 },
      ),
    [filteredSales],
  );

  const chartData = useMemo(() => {
    const dailyMap = {};
    filteredSales.forEach((sale) => {
      const day = new Date(sale.createdAt || sale.date).toLocaleDateString(
        "en-IN",
        { month: "short", day: "numeric" },
      );
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, profit: 0 };
      dailyMap[day].revenue += Number(sale.totalAmount || 0);
      dailyMap[day].profit += Number(sale.profit || 0);
    });
    return Object.values(dailyMap);
  }, [filteredSales]);

  const paymentData = useMemo(
    () => [
      {
        name: "Cash",
        value: filteredSales.reduce(
          (s, b) => s + Number(b.paymentSplit?.cash || 0),
          0,
        ),
      },
      {
        name: "UPI",
        value: filteredSales.reduce(
          (s, b) => s + Number(b.paymentSplit?.upi || 0),
          0,
        ),
      },
      {
        name: "Credit",
        value: filteredSales.reduce(
          (s, b) =>
            s + Number(b.paymentSplit?.credit ?? b.paymentSplit?.ucredit ?? 0),
          0,
        ),
      },
    ],
    [filteredSales],
  );

  const formatCurrency = (num) =>
    `₹${new Intl.NumberFormat("en-IN").format(Math.round(num))}`;

  return (
    <div className="text-white space-y-6 bg-transparent min-h-screen pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("  Retail Flow Analytics")}
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              {t("Performance Insights")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 panel-tech p-1.5 rounded-2xl shadow-inner">
          {["7d", "30d", "6m", "1y", "custom"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${range === r ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-white"}`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-[#111113] border border-slate-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
          />
          <span className="text-slate-600 font-black">TO</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-[#111113] border border-slate-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card
          title={t("Revenue")}
          value={formatCurrency(stats.revenue)}
          icon={IndianRupee}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
        />
        <Card
          title={t("Net Profit")}
          value={formatCurrency(stats.profit)}
          icon={TrendingUp}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <Card
          title={t("Gst Tax")}
          value={formatCurrency(stats.gst)}
          icon={Receipt}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <Card
          title={t("Pending Credit")}
          value={formatCurrency(stats.credit)}
          icon={CreditCard}
          color="text-rose-400"
          bg="bg-rose-500/10"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 min-w-0">
          <ChartBox title={t("Revenue Vs Profit")}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label={t("noSalesFound")} />
            )}
          </ChartBox>
        </div>
        <ChartBox title={t("Payment Split Title")}>
          {paymentData.some((p) => p.value > 0) ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={paymentData}>
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "12px",
                    border: "none",
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                  {paymentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0
                          ? "#10b981"
                          : index === 1
                            ? "#4f46e5"
                            : "#f43f5e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label={t("noSalesFound")} />
          )}
        </ChartBox>
      </div>
    </div>
  );
};

const Card = ({ title, value, icon: Icon, color, bg }) => (
  <div className="panel-tech rounded-4xl p-7 shadow-2xl flex items-center justify-between hover:border-indigo-500/40 transition-all group">
    <div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
        {title}
      </p>
      <h2 className="text-3xl font-black text-white">{value}</h2>
    </div>
    <div
      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg} ${color} group-hover:scale-110 transition-transform`}
    >
      <Icon size={28} />
    </div>
  </div>
);

const ChartBox = ({ title, children }) => (
  <div className="panel-tech rounded-4xl p-8 shadow-2xl h-full flex flex-col min-w-0 overflow-hidden">
    <h2 className="text-xs font-black mb-8 text-slate-400 uppercase tracking-widest">
      {title}
    </h2>
    <div className="flex-1 w-full min-h-75 min-w-0">{children}</div>
  </div>
);

const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-600">
    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
      <BarChart3 size={40} className="opacity-20" />
    </div>
    <p className="text-sm font-black uppercase tracking-widest">{label}</p>
  </div>
);

export default Reports;
