import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Copy,
  Check,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import API from "../api/axiosInstance";

// Typewriter hook for smooth text animation
function useTypewriter(text, speed = 8) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

// Animated AI message bubble with typewriter
function AIMessageBubble({ msg, isLatest, onCopy, copiedId }) {
  const { displayed, done } = useTypewriter(isLatest ? msg.text : null, 6);
  const content = isLatest ? displayed : msg.text;
  const showCursor = isLatest && !done;

  return (
    <div className="group relative max-w-[85%] sm:max-w-[75%] px-5 py-4 rounded-2xl rounded-tl-none text-sm leading-relaxed bg-[#111113] border border-slate-800 text-slate-200 shadow-sm">
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {showCursor && (
          <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
      {/* Copy button inside the bubble */}
      <button
        onClick={() => onCopy(msg.text, msg.id)}
        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 rounded-lg transition-all"
        title="Copy response"
      >
        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function AIChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [latestAiId, setLatestAiId] = useState(null);
  const { sales = [], items = [], shopProfile = {} } = useOutletContext();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Live stats for the welcome screen
  const liveStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = sales.filter((sale) => new Date(sale.createdAt) >= start);
    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const todayProfit = todaySales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
    const lowStockCount = items.filter((item) => {
      const qty = item.batches?.reduce((s, b) => s + Number(b.quantity || 0), 0) || 0;
      return qty <= Number(item.alertQuantity || 0);
    }).length;

    return {
      shopName: shopProfile.shopName || "My Shop",
      todaySalesCount: todaySales.length,
      todayRevenue,
      todayProfit,
      itemCount: items.length,
      lowStockCount,
    };
  }, [sales, items, shopProfile]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (textOverride) => {
      const textToSend = (textOverride || input).trim();
      if (!textToSend || loading) return;

      const userMsg = { id: Date.now(), role: "user", text: textToSend, timestamp: new Date() };
      const currentMessages = [...messages, userMsg];

      setMessages(currentMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await API.post("/ai/chat", {
          prompt: textToSend,
          messages: messages, // send full conversation history
        });

        const aiMsg = {
          id: Date.now() + 1,
          role: "ai",
          text: res.data.data || t("ai.errorResponse"),
          timestamp: new Date(),
        };
        setLatestAiId(aiMsg.id);
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const isQuota = err?.response?.status === 429;
        const errorMsg = {
          id: Date.now() + 1,
          role: "ai",
          text: isQuota
            ? `⚠️ **AI quota reached.** Please wait a moment and try again.`
            : `⚠️ **${t("common.error")}**: ${t("ai.connectionError")}`,
          timestamp: new Date(),
        };
        setLatestAiId(errorMsg.id);
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [input, loading, messages, t]
  );

  // Regenerate the last AI response
  const regenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    // Remove the last AI message
    setMessages((prev) => prev.slice(0, -1));
    sendMessage(lastUserMsg.text);
  }, [messages, sendMessage]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(t("common.copied"));
  };

  const clearChat = () => {
    setMessages([]);
    setLatestAiId(null);
    toast.info(t("ai.cleared"));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatCurrency = (n) =>
    n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

  const suggestions = [
    { label: t("ai.summaryLabel"), prompt: t("ai.summaryPrompt"), icon: BarChart3, color: "text-indigo-400" },
    { label: t("ai.productsLabel"), prompt: t("ai.productsPrompt"), icon: TrendingUp, color: "text-emerald-400" },
    { label: t("ai.inventoryLabel"), prompt: t("ai.inventoryPrompt"), icon: AlertTriangle, color: "text-amber-400" },
    { label: "Weekly trend", prompt: "Show me my revenue and profit trend for the last 7 days with a daily breakdown.", icon: ShoppingCart, color: "text-sky-400" },
    { label: "Customer credit", prompt: "Which customers have outstanding credit balances? What is the total amount owed?", icon: Users, color: "text-pink-400" },
    { label: "Expenses breakdown", prompt: "Summarize my expenses for the last 30 days, broken down by category.", icon: Wallet, color: "text-violet-400" },
  ];

  const lastMsg = messages[messages.length - 1];
  const canRegenerate = !loading && lastMsg?.role === "ai" && messages.length >= 2;

  return (
    <div className="h-[calc(100vh-120px)] w-full flex flex-col bg-[#09090b] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">

      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-indigo-600/8 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111113]/60 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
            <Sparkles className="text-indigo-400" size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#111113]" />
          </div>
          <div>
            <h1 className="font-black text-white tracking-tight text-base">StockBridge AI</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {t("ai.activeStatus")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canRegenerate && (
            <button
              onClick={regenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 rounded-xl transition-all"
              title="Regenerate last response"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline font-semibold">Regenerate</span>
            </button>
          )}
          <button
            onClick={clearChat}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
            title={t("ai.clearChat")}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {/* Welcome State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-in fade-in zoom-in duration-500">
            {/* Live Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mb-8">
              {[
                {
                  label: "Today's Revenue",
                  value: formatCurrency(liveStats.todayRevenue),
                  icon: Wallet,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  label: "Sales Today",
                  value: liveStats.todaySalesCount,
                  icon: ShoppingCart,
                  color: "text-indigo-400",
                  bg: "bg-indigo-500/10 border-indigo-500/20",
                },
                {
                  label: "Low Stock",
                  value: liveStats.lowStockCount,
                  icon: Package,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`${stat.bg} border rounded-2xl p-3.5 text-left`}
                >
                  <stat.icon size={16} className={`${stat.color} mb-2`} />
                  <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="w-14 h-14 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-4 border border-slate-700/50">
              <Bot className="text-slate-400" size={28} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{t("ai.welcomeTitle")}</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">
              {t("ai.welcomeDesc")}
            </p>

            {/* Suggestion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.prompt)}
                  className="flex items-center justify-between p-3.5 bg-slate-800/30 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800/60 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <s.icon size={16} className={s.color} />
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">{s.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div className={`p-2 rounded-xl border shrink-0 mb-5 ${
              msg.role === "user"
                ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20"
                : "bg-slate-800 border-slate-700"
            }`}>
              {msg.role === "user"
                ? <User size={14} />
                : <Bot size={14} className="text-indigo-400" />}
            </div>

            <div className="flex flex-col gap-1">
              {/* Bubble */}
              {msg.role === "ai" ? (
                <AIMessageBubble
                  msg={msg}
                  isLatest={msg.id === latestAiId}
                  onCopy={copyToClipboard}
                  copiedId={copiedId}
                />
              ) : (
                <div className="max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl rounded-br-none text-sm leading-relaxed bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  {msg.text}
                </div>
              )}
              {/* Timestamp */}
              <div className={`flex items-center gap-1 text-[10px] text-slate-600 font-medium ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <Clock size={9} />
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3 animate-in fade-in duration-200">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
              <Bot size={14} className="text-indigo-400" />
            </div>
            <div className="bg-[#111113] border border-slate-800 px-5 py-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                <span className="ml-2 text-xs text-slate-500 font-medium">Analyzing your shop data…</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestion Chips (after first message) */}
      {messages.length > 0 && !loading && (
        <div className="px-6 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s.prompt)}
              className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/40 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all shrink-0"
            >
              <s.icon size={11} className={s.color} />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Section */}
      <div className="p-5 border-t border-slate-800 bg-[#111113]/60 backdrop-blur-md shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-3"
        >
          <input
            ref={inputRef}
            className="flex-1 pl-4 pr-4 py-3.5 rounded-2xl bg-[#09090b] border border-slate-800 text-white text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-600"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={t("ai.inputPlaceholder")}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 p-3.5 rounded-2xl text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
          >
            <Send size={19} />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest mt-3">
          {t("ai.footer")}
        </p>
      </div>
    </div>
  );
}