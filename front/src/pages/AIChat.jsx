import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import API from "../api/axiosInstance";

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { sales = [], items = [], shopProfile = {} } = useOutletContext();

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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const contextualPrompt = `
Shop: ${aiContext.shopName}
Today sales count: ${aiContext.todaySalesCount}
Today revenue: ₹${aiContext.todayRevenue}
Today profit: ₹${aiContext.todayProfit}
Total inventory items: ${aiContext.itemCount}

Question: ${input}
`;
      const res = await API.post("/ai/chat", {
        prompt: contextualPrompt,
      });
      const data = res.data;

      setMessages([
        ...newMessages,
        { role: "ai", text: data.data || "No response" },
      ]);
    } catch (_err) {
      setMessages([
        ...newMessages,
        {
          role: "ai",
          text: "I could not process that. Please ask a shop-specific question and try again.",
        },
      ]);
    }

    setLoading(false);
    setInput("");
  };

  return (
    <div className="h-full w-full flex flex-col panel-tech rounded-2xl overflow-hidden text-white">

      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h1 className="font-semibold">StockBridge AI Assistant</h1>
        </div>
        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
          Shop-only answers
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.length === 0 && (
          <div className="text-slate-400 text-center mt-10">
            Ask about sales, inventory, profit, and trends for your shop.
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600"
                  : "bg-[#09090b] border border-slate-700"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing Animation */}
        {loading && (
          <div className="text-slate-400 text-sm">AI is thinking...</div>
        )}
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {[
          "Give today's profit and revenue summary.",
          "Which products are top-selling this week?",
          "Show low stock items and reorder advice.",
        ].map((q, i) => (
          <button
            key={i}
            onClick={() => setInput(q)}
            className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded-full hover:bg-slate-700"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 flex gap-2">
        <input
          className="flex-1 p-2.5 rounded-lg bg-[#09090b] border border-slate-700 focus:outline-none focus:border-indigo-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your shop performance..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-indigo-600 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}