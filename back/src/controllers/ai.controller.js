import groq from "../utils/groqClient.js";
import Sale from "../models/Sale.js";
import Item from "../models/Item.js";
import Expense from "../models/Expense.js";
import Customer from "../models/Customer.js";
import Supplier from "../models/Supplier.js";
import Staff from "../models/Staff.js";
import Shop from "../models/Shop.js";

// Cache for shop snapshots only (not per-prompt), keyed by shopId
const snapshotCache = new Map();
const SNAPSHOT_TTL = 5 * 60 * 1000; // 5 minutes

const getShopSnapshot = async (shopId) => {
  const cached = snapshotCache.get(String(shopId));
  if (cached && Date.now() - cached.time < SNAPSHOT_TTL) {
    return cached.data;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [sales, items, expenses, customers, suppliers, staff, shop] = await Promise.all([
    Sale.find({ shop: shopId }).sort({ createdAt: -1 }).lean(),
    Item.find({ shop: shopId }).lean(),
    Expense.find({ shop: shopId }).sort({ createdAt: -1 }).lean(),
    Customer.find({ shop: shopId }).lean(),
    Supplier.find({ shop: shopId }).lean(),
    Staff.find({ shop: shopId }).lean(),
    Shop.findById(shopId).lean(),
  ]);

  // --- Today ---
  const todaySales = sales.filter((s) => new Date(s.createdAt) >= startOfToday);
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + Number(s.profit || 0), 0);

  // --- Last 7 days ---
  const sales7d = sales.filter((s) => new Date(s.createdAt) >= start7d);
  const revenue7d = sales7d.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const profit7d = sales7d.reduce((sum, s) => sum + Number(s.profit || 0), 0);

  // --- Last 30 days ---
  const sales30d = sales.filter((s) => new Date(s.createdAt) >= start30d);
  const revenue30d = sales30d.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const profit30d = sales30d.reduce((sum, s) => sum + Number(s.profit || 0), 0);

  // --- Daily breakdown (last 7 days) ---
  const dailyBreakdown = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyBreakdown[key] = { revenue: 0, profit: 0, salesCount: 0 };
  }
  sales7d.forEach((sale) => {
    const key = new Date(sale.createdAt).toISOString().split("T")[0];
    if (dailyBreakdown[key]) {
      dailyBreakdown[key].revenue += Number(sale.totalAmount || 0);
      dailyBreakdown[key].profit += Number(sale.profit || 0);
      dailyBreakdown[key].salesCount += 1;
    }
  });

  // --- Top performing items (30d) ---
  const itemPerformance = new Map();
  const inventoryIds = new Set(items.map((item) => String(item._id)));
  sales30d.forEach((sale) => {
    sale.items?.forEach((line) => {
      if (!inventoryIds.has(String(line.itemId))) return;
      const prev = itemPerformance.get(line.name) || { quantity: 0, revenue: 0 };
      prev.quantity += Number(line.quantity || 0);
      prev.revenue += Number(line.sellingPrice || 0) * Number(line.quantity || 0);
      itemPerformance.set(line.name, prev);
    });
  });

  const topItems = [...itemPerformance.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 8)
    .map(([name, info]) => ({ name, qtySold: info.quantity, revenue: Math.round(info.revenue) }));

  // --- Low stock items ---
  const lowStockItems = items
    .map((item) => {
      const totalQty = item.batches?.reduce((sum, b) => sum + Number(b.quantity || 0), 0) || 0;
      return { name: item.name, stock: totalQty, alertQuantity: Number(item.alertQuantity || 0) };
    })
    .filter((item) => item.stock <= item.alertQuantity)
    .slice(0, 10);

  // --- Out of stock ---
  const outOfStock = items
    .filter((item) => {
      const totalQty = item.batches?.reduce((sum, b) => sum + Number(b.quantity || 0), 0) || 0;
      return totalQty === 0;
    })
    .map((item) => item.name)
    .slice(0, 10);

  // --- Expenses (30d) ---
  const expenses30d = expenses.filter((e) => new Date(e.createdAt) >= start30d);
  const totalExpenses30d = expenses30d.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expenseByCategory = {};
  expenses30d.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount || 0);
  });

  // --- Customers ---
  const customersWithCredit = customers.filter((c) => c.totalCredit > 0);
  const totalOutstandingCredit = customersWithCredit.reduce((sum, c) => sum + c.totalCredit, 0);

  // --- Payment method breakdown (30d) ---
  const paymentMethods = { cash: 0, upi: 0, credit: 0 };
  sales30d.forEach((sale) => {
    if (sale.paymentSplit) {
      paymentMethods.cash += Number(sale.paymentSplit.cash || 0);
      paymentMethods.upi += Number(sale.paymentSplit.upi || 0);
      paymentMethods.credit += Number(sale.paymentSplit.credit || 0);
    }
  });

  // --- Lifetime Statistics ---
  const lifetimeRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  const lifetimeProfit = sales.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const lifetimeExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const lifetimePaymentMethods = { cash: 0, upi: 0, credit: 0 };
  sales.forEach((sale) => {
    if (sale.paymentSplit) {
      lifetimePaymentMethods.cash += Number(sale.paymentSplit.cash || 0);
      lifetimePaymentMethods.upi += Number(sale.paymentSplit.upi || 0);
      lifetimePaymentMethods.credit += Number(sale.paymentSplit.credit || 0);
    }
  });

  // --- Structured Supplier List ---
  const supplierList = suppliers.map((sup) => ({
    name: sup.name,
    phone: sup.phone,
    email: sup.email || "",
    address: sup.address || "",
    gstin: sup.gstin || "",
    totalPurchased: Math.round(sup.totalPurchased || 0),
    totalDue: Math.round(sup.totalDue || 0),
    purchaseCount: sup.purchaseHistory ? sup.purchaseHistory.length : 0,
  }));

  // --- Structured Staff List (Excluding sensitive fields like pin/password/otp) ---
  const staffList = staff.map((s) => ({
    name: s.name,
    phone: s.phone,
    role: s.role,
    isActive: s.isActive,
    permissions: s.permissions,
  }));

  // --- Structured Shop Info ---
  const shopInfo = shop
    ? {
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        email: shop.email,
        phone: shop.phone,
        address: shop.address || "",
        gstEnabled: shop.gstEnabled,
        gst: shop.gst || "",
        upiId: shop.upiId || "",
        bankName: shop.bankName || "",
        isPremium: shop.isPremium || false,
        language: shop.language || "en",
      }
    : null;

  // --- Sliced Recent lists for transaction level context (last 15 entries) ---
  const slicedRecentSales = sales.slice(0, 15).map((s) => ({
    id: s._id,
    customerName: s.customerName || "Walk-in Customer",
    totalAmount: Math.round(s.totalAmount || 0),
    profit: Math.round(s.profit || 0),
    paymentSplit: s.paymentSplit,
    createdAt: s.createdAt,
    items: s.items?.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
    })),
  }));

  const slicedRecentExpenses = expenses.slice(0, 15).map((e) => ({
    id: e._id,
    title: e.title,
    amount: Math.round(e.amount || 0),
    category: e.category,
    createdAt: e.createdAt,
    description: e.description || "",
  }));

  const snapshot = {
    shopInfo,
    totalItems: items.length,
    today: {
      salesCount: todaySales.length,
      revenue: Math.round(todayRevenue),
      profit: Math.round(todayProfit),
      margin: todayRevenue > 0 ? Math.round((todayProfit / todayRevenue) * 100) : 0,
    },
    last7Days: {
      salesCount: sales7d.length,
      revenue: Math.round(revenue7d),
      profit: Math.round(profit7d),
      dailyBreakdown,
    },
    last30Days: {
      salesCount: sales30d.length,
      revenue: Math.round(revenue30d),
      profit: Math.round(profit30d),
      expenses: Math.round(totalExpenses30d),
      netProfit: Math.round(profit30d - totalExpenses30d),
      expenseByCategory,
      paymentMethods,
    },
    lifetimeStats: {
      salesCount: sales.length,
      revenue: Math.round(lifetimeRevenue),
      profit: Math.round(lifetimeProfit),
      expenses: Math.round(lifetimeExpenses),
      netProfit: Math.round(lifetimeProfit - lifetimeExpenses),
      paymentMethods: lifetimePaymentMethods,
      expenseCount: expenses.length,
    },
    inventory: {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      outOfStockCount: outOfStock.length,
      outOfStockItems: outOfStock,
    },
    topItems,
    customers: {
      total: customers.length,
      withOutstandingCredit: customersWithCredit.length,
      totalOutstandingCredit: Math.round(totalOutstandingCredit),
    },
    suppliers: supplierList,
    staff: staffList,
    recentSales: slicedRecentSales,
    recentExpenses: slicedRecentExpenses,
  };

  snapshotCache.set(String(shopId), { data: snapshot, time: Date.now() });
  return snapshot;
};

const aiLanguageInstructions = {
  en: "Respond in professional, friendly English. Use bullet points and markdown formatting where helpful.",
  hi: "हिंदी में उत्तर दें। बुलेट पॉइंट और स्पष्ट फ़ॉर्मेटिंग का उपयोग करें।",
  kn: "ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ. ಸ್ಪಷ್ಟ ಮತ್ತು ಸರಳ ಭಾಷೆ ಬಳಸಿ.",
};

export const getGeminiInsights = async (req, res) => {
  try {
    const { prompt, messages: conversationHistory = [] } = req.body;
    const lang = req.language || "en";

    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt is required" });
    }

    const shopId = req.shop?.id;
    if (!shopId) {
      return res.status(401).json({ success: false, message: "Shop context missing. Please login again." });
    }

    const snapshot = await getShopSnapshot(shopId);

    // Localize item names
    const localizeItemName = (name) =>
      typeof name === "object" ? name[lang] || name.en : name;

    const localizedSnapshot = {
      ...snapshot,
      inventory: {
        ...snapshot.inventory,
        lowStockItems: snapshot.inventory.lowStockItems.map((item) => ({
          ...item,
          name: localizeItemName(item.name),
        })),
        outOfStockItems: snapshot.inventory.outOfStockItems.map(localizeItemName),
      },
      topItems: snapshot.topItems.map((item) => ({
        ...item,
        name: localizeItemName(item.name),
      })),
      recentSales: snapshot.recentSales?.map((sale) => ({
        ...sale,
        items: sale.items?.map((item) => ({
          ...item,
          name: localizeItemName(item.name),
        })),
      })),
    };

    // Build multi-turn message array for Groq
    // Take the last 10 conversation turns to avoid token overflow
    const recentHistory = conversationHistory.slice(-10).map((msg) => ({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text,
    }));

    const systemPrompt = `You are StockBridge AI, an expert retail business analytics assistant embedded in a POS and inventory management system called StockBridge.

PERSONALITY:
- Professional, helpful, and encouraging
- Concise yet thorough — avoid unnecessary filler words
- Use markdown (bold, bullet points, tables) to structure responses clearly
- Use Indian currency format (₹) always
- You have real-time access to the shop's live business data shown below

STRICT RULES:
- ${aiLanguageInstructions[lang]}
- Only answer questions related to the shop's business, inventory, sales, expenses, customers, or financial performance
- NEVER invent numbers or facts not present in the shop data context
- If asked about something outside your scope (e.g., weather, politics, coding), politely decline and redirect to business topics
- Do not mention product names that are not in the inventory
- If data is missing, say clearly "this data is not available"

CURRENT SHOP DATA:
${JSON.stringify(localizedSnapshot, null, 2)}

Today's date: ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: prompt },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens: 1024,
      temperature: 0.4,
    });

    const responseText = completion.choices?.[0]?.message?.content;
    if (!responseText) throw new Error("No response from AI");

    return res.status(200).json({ success: true, data: responseText });
  } catch (error) {
    console.error("AI Error:", error);

    if (error?.status === 429) {
      return res.status(429).json({ success: false, message: "AI quota exceeded. Try again in a moment." });
    }

    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};
