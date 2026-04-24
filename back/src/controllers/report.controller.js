import Sale from "../models/Sale.js";
import Item from "../models/Item.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import mongoose from "mongoose";

export const getDashboardStats = async (req, res, next) => {
  try {
    const shopId = new mongoose.Types.ObjectId(req.shop.id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [salesAgg, creditAgg, inventoryAgg, expensesAgg, recentSales] =
      await Promise.all([
        // 1. Single aggregation for today + month sales stats
        Sale.aggregate([
          { $match: { shop: shopId } },
          {
            $facet: {
              today: [
                { $match: { createdAt: { $gte: startOfToday } } },
                {
                  $group: {
                    _id: null,
                    revenue: { $sum: "$totalAmount" },
                    profit: { $sum: "$profit" },
                    count: { $sum: 1 },
                  },
                },
              ],
              month: [
                { $match: { createdAt: { $gte: startOfMonth } } },
                {
                  $group: {
                    _id: null,
                    revenue: { $sum: "$totalAmount" },
                    profit: { $sum: "$profit" },
                  },
                },
              ],
            },
          },
        ]),

        Customer.aggregate([
          { $match: { shop: shopId } },
          { $group: { _id: null, total: { $sum: "$totalCredit" } } },
        ]),

        Item.aggregate([
          { $match: { shop: shopId } },
          { $unwind: "$batches" },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$batches.purchasePrice", "$batches.quantity"],
                },
              },
            },
          },
        ]),

        Expense.aggregate([
          { $match: { shop: shopId, date: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),

        Sale.find({ shop: shopId })
          .sort({ createdAt: -1 })
          .limit(30)
          .select(
            "totalAmount profit paymentSplit createdAt invoiceNumber customer",
          )
          .lean(),
      ]);

    const todayStats = salesAgg[0]?.today?.[0] || {};
    const monthStats = salesAgg[0]?.month?.[0] || {};

    const todaysRevenue = todayStats.revenue || 0;
    const todaysProfit = todayStats.profit || 0;
    const monthRevenue = monthStats.revenue || 0;
    const monthProfit = monthStats.profit || 0;
    const totalSalesCount = todayStats.count || 0;

    const totalCredit = creditAgg[0]?.total || 0;
    const inventoryValue = inventoryAgg[0]?.total || 0;
    const monthExpenses = expensesAgg[0]?.total || 0;
    const netProfit = monthProfit - monthExpenses;

    res.status(200).json({
      success: true,
      data: {
        todaysRevenue,
        todaysProfit,
        monthRevenue,
        monthProfit,
        netProfit,
        totalCredit,
        inventoryValue,
        totalSalesCount,
        sales: recentSales,
      },
    });
  } catch (error) {
    next(error);
  }
};
