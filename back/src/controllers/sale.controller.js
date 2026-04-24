import mongoose from "mongoose";
import Sale from "../models/Sale.js";
import Item from "../models/Item.js";
import Customer from "../models/Customer.js";
import { cache } from "../utils/cache.js";

// @desc    Get all sales for the shop
// @route   GET /api/v1/sales
export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    let query = { shop: req.shop.id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Only cache the default (no date filters) listing
    if (!startDate && !endDate) {
      const key = `sales:${req.shop.id}:default`;
      const cached = cache.get(key);
      if (cached) {
        return res
          .status(200)
          .json({
            success: true,
            count: cached.length,
            data: cached,
            cached: true,
          });
      }
      const sales = await Sale.find(query)
        .sort("-createdAt")
        .limit(limit ? parseInt(limit) : 50)
        .lean();
      cache.set(key, sales, 30_000); // 30s TTL — sales change often
      return res
        .status(200)
        .json({ success: true, count: sales.length, data: sales });
    }

    const sales = await Sale.find(query)
      .sort("-createdAt")
      .limit(limit ? parseInt(limit) : 50)
      .lean();

    res.status(200).json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new Sale
// @route   POST /api/v1/sales
export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, items = [], paymentSplit = {}, totalPurchasePrice } = req.body;
    const normalizedPaymentSplit = {
      cash: Number(paymentSplit.cash || 0),
      upi: Number(paymentSplit.upi || 0),
      // Backward-compatible read for legacy "ucredit", canonical write is "credit"
      credit: Number(paymentSplit.credit ?? paymentSplit.ucredit ?? 0),
    };

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item is required");
    }

    // Credit limit check
    if (normalizedPaymentSplit.credit > 0 && customer) {
      const dbCustomer = await Customer.findById(customer)
        .session(session)
        .lean();
      if (dbCustomer && dbCustomer.creditLimit > 0) {
        const projectedCredit = dbCustomer.totalCredit + normalizedPaymentSplit.credit;
        if (projectedCredit > dbCustomer.creditLimit) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: `Credit limit exceeded!`,
          });
        }
      }
    }

    let totalAmount = 0;
    let calculatedPurchasePrice = 0;

    // STEP 1: Fetch all items in ONE query
    const itemIds = items.map((i) => i.itemId);
    const dbItems = await Item.find({
      _id: { $in: itemIds },
      shop: req.shop.id,
    }).session(session);

    // STEP 2: Create map for O(1) lookup
    const itemMap = {};
    dbItems.forEach((item) => {
      itemMap[item._id.toString()] = item;
    });

    // STEP 3: Loop WITHOUT individual DB calls
    for (let orderItem of items) {
      const item = itemMap[orderItem.itemId];
      if (!item) throw new Error(`Item not found`);

      const batch = item.batches.id(orderItem.batchId);
      if (!batch || batch.quantity < orderItem.quantity) {
        throw new Error(`Insufficient stock for: ${item.name}`);
      }

      batch.quantity -= orderItem.quantity;
      totalAmount += orderItem.sellingPrice * orderItem.quantity;
      calculatedPurchasePrice +=
        (orderItem.purchasePrice || batch.purchasePrice || 0) *
        orderItem.quantity;
    }

    // STEP 4: Save all items in parallel
    await Promise.all(dbItems.map((item) => item.save({ session })));

    // Payment validation
    const totalPaid =
      normalizedPaymentSplit.cash +
      normalizedPaymentSplit.upi +
      normalizedPaymentSplit.credit;

    if (Math.round(totalPaid * 100) !== Math.round(totalAmount * 100)) {
      throw new Error(`Payment mismatch`);
    }

    const finalPurchasePrice = totalPurchasePrice || calculatedPurchasePrice;
    const profit = totalAmount - finalPurchasePrice;

    const sale = new Sale({
      shop: req.shop.id,
      customer: customer || null,
      items: items.map((i) => ({
        itemId: i.itemId,
        batchId: i.batchId,
        name: i.name,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice,
        purchasePrice: i.purchasePrice || 0,
      })),
      totalAmount,
      totalPurchasePrice: finalPurchasePrice,
      profit,
      paymentSplit: normalizedPaymentSplit,
    });

    await sale.save({ session });

    // Khata update
    if (normalizedPaymentSplit.credit > 0 && customer) {
      const dbCustomer = await Customer.findById(customer).session(session);
      dbCustomer.totalCredit += normalizedPaymentSplit.credit;
      dbCustomer.khataHistory.push({
        transactionType: "CREDIT_GIVEN",
        amount: normalizedPaymentSplit.credit,
        description: `Invoice: ${sale.invoiceNumber}`,
      });
      await dbCustomer.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Invalidate related caches after a sale
    cache.invalidate(`sales:${req.shop.id}`);
    cache.invalidate(`items:${req.shop.id}`);
    cache.invalidate(`dashboard:${req.shop.id}`);
    if (customer) cache.invalidate(`customers:${req.shop.id}`);

    res.status(201).json({
      success: true,
      message: "Sale completed! 🧾",
      data: sale,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};
