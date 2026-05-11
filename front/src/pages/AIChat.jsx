import { useMemo, useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Import remarkGfm
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
  Check
} from "lucide-react";
import { toast } from "sonner";
import API from "../api/axiosInstance";

export default function AIChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const { sales = [], items = [], shopProfile = {} } = useOutletContext();
  const scrollRef = useRef(null);

  const aiContext = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = sales.filter((sale) => new Date(sale.createdAt) >= start);
    const todayRevenue = todaySales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount || 0),
      0,
    );
    const todayProfit = todaySales.reduce(
      (sum, sale) => sum + Number(sale.profit || 0),
      0,
    );
    return {
      shopName: shopProfile.shopName || "My Shop",
      todaySalesCount: todaySales.length,
      todayRevenue,
      todayProfit,
      itemCount: items.length,
    };
  }, [sales, items, shopProfile.shopName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textOverride) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { id: Date.now(), role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const contextualPrompt = `
Context:
Shop: ${aiContext.shopName}
Today sales: ${aiContext.todaySalesCount}
Today revenue: ₹${aiContext.todayRevenue}
Today profit: ₹${aiContext.todayProfit}
Total items in stock: ${aiContext.itemCount}

User Question: ${textToSend}

Instructions: Provide a concise, professional, and data-driven response. Use markdown (bold, lists, etc.) where appropriate. Focus strictly on the shop's data.
`;
      const res = await API.post("/ai/chat", {
        prompt: contextualPrompt,
      });

      const aiMsg = { 
        id: Date.now() + 1, 
        role: "ai", 
        text: res.data.data || t("ai.errorResponse") 
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: `⚠️ **${t("common.error")}**: ${t("ai.connectionError")}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(t("common.copied"));
  };

  const clearChat = () => {
    setMessages([]);
    toast.info(t("ai.cleared"));
  };

  const suggestions = [
    { label: t("ai.summaryLabel"), prompt: t("ai.summaryPrompt"), icon: BarChart3 },
    { label: t("ai.productsLabel"), prompt: t("ai.productsPrompt"), icon: TrendingUp },
    { label: t("ai.inventoryLabel"), prompt: t("ai.inventoryPrompt"), icon: AlertTriangle },
  ];

  return (
    <div className="h-[calc(100vh-120px)] w-full flex flex-col bg-[#09090b] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">

      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111113]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
            <Sparkles className="text-indigo-400" size={20} />
          </div>
          <div>
            <h1 className="font-black text-white tracking-tight">StockBridge AI</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t("ai.activeStatus")}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
          title={t("ai.clearChat")}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border border-slate-700/50">
              <Bot className="text-slate-400" size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{t("ai.welcomeTitle")}</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
              {t("ai.welcomeDesc")}
            </p>
            <div className="grid gap-3 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.prompt)}
                  className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <s.icon size={18} className="text-indigo-400" />
                    <span className="text-sm font-bold text-slate-300 group-hover:text-white">{s.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-300 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div className={`p-2 rounded-xl border shrink-0 ${
              msg.role === "user" 
                ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20" 
                : "bg-slate-800 border-slate-700"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} className="text-indigo-400" />}
            </div>

            <div className={`group relative max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-none"
                : "bg-[#111113] border border-slate-800 text-slate-200 rounded-tl-none"
            }`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>

              {msg.role === "ai" && (
                <button 
                  onClick={() => copyToClipboard(msg.text, msg.id)}
                  className="absolute -right-10 top-2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 transition-all"
                >
                  {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
              <Bot size={16} className="text-indigo-400" />
            </div>
            <div className="bg-[#111113] border border-slate-800 px-5 py-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Suggestions Panel */}
      {messages.length > 0 && !loading && (
        <div className="px-6 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s.prompt)}
              className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-slate-800/40 border border-slate-800 rounded-xl text-[11px] font-black text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all"
            >
              <s.icon size={12} className="text-indigo-500" />
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Section */}
      <div className="p-6 border-t border-slate-800 bg-[#111113]/50 backdrop-blur-md">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-3"
        >
          <div className="relative flex-1 group">
            <input
              className="w-full pl-4 pr-4 py-3.5 rounded-2xl bg-[#09090b] border border-slate-800 text-white text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ai.inputPlaceholder")}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 p-3.5 rounded-2xl text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mt-4">
          {t("ai.footer")}
        </p>
      </div>
    </div>
  );
}