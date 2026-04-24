import groq from "../utils/groqClient.js";
import Sale from "../models/Sale.js";
import Item from "../models/Item.js";

const insightCache = new Map();

const getShopSnapshot = async (shopId) => {
  const [recentSales, items] = await Promise.all([
    Sale.find({ shop: shopId }).sort({ createdAt: -1 }).limit(200).lean(),
    Item.find({ shop: shopId }).lean(),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaySales = recentSales.filter((sale) => sale.createdAt >= startOfDay);
  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + Number(sale.totalAmount || 0),
    0,
  );
  const todayProfit = todaySales.reduce(
    (sum, sale) => sum + Number(sale.profit || 0),
    0,
  );

  const inventoryIds = new Set(items.map((item) => String(item._id)));
  const itemPerformance = new Map();
  recentSales.forEach((sale) => {
    sale.items?.forEach((line) => {
      if (!inventoryIds.has(String(line.itemId))) {
        return;
      }
      const previous = itemPerformance.get(line.name) || { quantity: 0, revenue: 0 };
      previous.quantity += Number(line.quantity || 0);
      previous.revenue += Number(line.sellingPrice || 0) * Number(line.quantity || 0);
      itemPerformance.set(line.name, previous);
    });
  });

  const topItems = [...itemPerformance.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5)
    .map(([name, info]) => ({
      name,
      quantity: info.quantity,
      revenue: info.revenue,
    }));

  const lowStockItems = items
    .map((item) => {
      const totalQty =
        item.batches?.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0) ||
        0;
      return {
        name: item.name,
        stock: totalQty,
        alertQuantity: Number(item.alertQuantity || 0),
      };
    })
    .filter((item) => item.stock <= item.alertQuantity)
    .slice(0, 10);

  return {
    totalItems: items.length,
    inventoryItemNames: items.map((item) => item.name),
    totalSalesCount: recentSales.length,
    todaySalesCount: todaySales.length,
    todayRevenue,
    todayProfit,
    lowStockItems,
    topItems,
  };
};

export const getGeminiInsights = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const shopId = req.shop?.id;
    if (!shopId) {
      return res.status(401).json({
        success: false,
        message: "Shop context missing. Please login again.",
      });
    }
    const cacheKey = `${shopId}_${prompt}`;

    const cached = insightCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
      return res.status(200).json({
        success: true,
        data: cached.text,
        cached: true,
      });
    }

    const snapshot = await getShopSnapshot(shopId);
    console.time("AI Response");

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You are a professional retail business analytics assistant.

IMPORTANT RULES:
- Respond ONLY in English
- Do NOT use Hindi or any other language
- Keep responses clear, concise, and professional
- Use Indian currency format (₹) when needed
- Answer only using the provided shop data context
- Refuse politely if the user asks unrelated non-shop information
- Never invent numbers that are not in the context
- Never mention product names outside inventoryItemNames
`,
        },
        {
          role: "user",
          content: `
SHOP DATA CONTEXT:
${JSON.stringify(snapshot)}

USER QUESTION:
${prompt}

IMPORTANT:
Respond strictly in English only. No Hindi.
If data is unavailable for a request, clearly say it is not available.
`,
        },
      ],
      max_tokens: 260,
      temperature: 0.5,
    });

    console.timeEnd("AI Response");

    const responseText = completion.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from AI");
    }

    insightCache.set(cacheKey, {
      text: responseText,
      time: Date.now(),
    });

    return res.status(200).json({
      success: true,
      data: responseText,
    });
  } catch (error) {
    console.error("AI Error:", error);

    if (error?.status === 429) {
      return res.status(429).json({
        success: false,
        message: "AI quota exceeded. Try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
