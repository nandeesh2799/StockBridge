import mongoose from "mongoose";
import Item from "../models/Item.js";
import { cache } from "../utils/cache.js";
import Expense from "../models/Expense.js";
import { lookupBarcodeOnline } from "../utils/barcodeLookup.js";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTotalQuantity = (batches = []) =>
  batches.reduce((sum, batch) => sum + Math.max(0, toNumber(batch?.quantity)), 0);

const getWeightedPurchasePrice = (batches = []) => {
  const totals = batches.reduce(
    (acc, batch) => {
      const quantity = Math.max(0, toNumber(batch?.quantity));
      const purchasePrice = Math.max(0, toNumber(batch?.purchasePrice));
      acc.quantity += quantity;
      acc.amount += quantity * purchasePrice;
      return acc;
    },
    { quantity: 0, amount: 0 },
  );

  if (totals.quantity <= 0) return 0;
  return totals.amount / totals.quantity;
};

const createPurchaseExpense = async ({
  req,
  itemName,
  quantityAdded,
  purchasePrice,
  date,
}) => {
  const safeQuantity = Math.max(0, toNumber(quantityAdded));
  const safePurchasePrice = Math.max(0, toNumber(purchasePrice));
  const amount = Number((safeQuantity * safePurchasePrice).toFixed(2));

  if (safeQuantity <= 0 || safePurchasePrice <= 0 || amount <= 0) return;

  await Expense.create({
    shop: req.shop.id,
    category: "Purchase",
    amount,
    description: `Stock purchase: ${itemName} x ${safeQuantity} @ ${safePurchasePrice}`,
    date: date ? new Date(date) : Date.now(),
    paymentMethod: "Cash",
    addedBy: req.staff?._id || req.shop._id,
    addedByModel: req.staff ? "Staff" : "Shop",
  });
};

// @desc    Add a new item
// @route   POST /api/v1/items
export const addItem = async (req, res) => {
  try {
    const { name, category, unit, batches, alertQuantity, taxPercent, hsn, barcode } =
      req.body;

    const cleanBarcode = (barcode || "").trim();
    if (!cleanBarcode) {
      return res
        .status(400)
        .json({ success: false, message: "Barcode is required." });
    }

    const exists = await Item.findOne({ shop: req.shop.id, barcode: cleanBarcode });
    if (exists) {
      return res.status(200).json({
        success: true,
        data: exists,
        message: "Item already exists in your shop for this barcode.",
      });
    }

    // Ensure name and category are objects for multilingual support
    const nameObj = typeof name === "string" ? { en: name, hi: "", kn: "" } : name;
    const categoryObj = typeof category === "string" ? { en: category, hi: "", kn: "" } : category;

    const item = await Item.create({
      shop: req.shop.id,
      name: nameObj,
      category: categoryObj,
      unit,
      batches,
      alertQuantity,
      taxPercent: taxPercent || 0,
      hsn: hsn || "",
      barcode: cleanBarcode,
    });

    const createdBatches = Array.isArray(batches) ? batches : [];
    await createPurchaseExpense({
      req,
      itemName: nameObj.en || nameObj.hi || nameObj.kn,
      quantityAdded: getTotalQuantity(createdBatches),
      purchasePrice: getWeightedPurchasePrice(createdBatches),
      date: createdBatches[0]?.addedDate || Date.now(),
    });

    cache.invalidate(`items:${req.shop.id}`);

    res
      .status(201)
      .json({ success: true, data: item, message: "Item added! 📦" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all items
// @route   GET /api/v1/items
export const getItems = async (req, res) => {
  try {
    const key = `items:${req.shop.id}`;
    const cached = cache.get(key);
    if (cached) {
      return res.status(200).json({
        success: true,
        count: cached.length,
        data: cached,
        cached: true,
      });
    }

    const items = await Item.find({ shop: req.shop.id })
      .sort("-createdAt")
      .lean();

    cache.set(key, items, 60_000); // 60s TTL

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update an item
// @route   PUT /api/v1/items/:id
export const updateItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, shop: req.shop.id });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found." });
    }

    const previousTotalQuantity = getTotalQuantity(item.batches);
    const { name, category, unit, batches, alertQuantity, taxPercent, hsn, adjustments } =
      req.body;

    if (name) {
      item.name = typeof name === "string" ? { ...item.name, en: name } : { ...item.name, ...name };
    }
    if (category) {
      item.category = typeof category === "string" ? { ...item.category, en: category } : { ...item.category, ...category };
    }
    if (unit) item.unit = unit;
    if (batches) item.batches = batches;
    if (alertQuantity !== undefined) item.alertQuantity = alertQuantity;
    if (taxPercent !== undefined) item.taxPercent = taxPercent;
    if (hsn !== undefined) item.hsn = hsn;
    if (adjustments) item.adjustments = adjustments;

    await item.save();

    const updatedBatches = Array.isArray(batches) ? batches : item.batches || [];
    const updatedTotalQuantity = getTotalQuantity(updatedBatches);
    const quantityAdded = Math.max(0, updatedTotalQuantity - previousTotalQuantity);

    await createPurchaseExpense({
      req,
      itemName: item.name.en || item.name.hi || item.name.kn,
      quantityAdded,
      purchasePrice: getWeightedPurchasePrice(updatedBatches),
      date: updatedBatches[0]?.addedDate || Date.now(),
    });

    cache.invalidate(`items:${req.shop.id}`);

    res
      .status(200)
      .json({ success: true, data: item, message: "Item updated!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an item
// @route   DELETE /api/v1/items/:id
export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, shop: req.shop.id });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found." });
    }

    await item.deleteOne();

    cache.invalidate(`items:${req.shop.id}`);

    res.status(200).json({ success: true, message: "Item deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get inventory stats
// @route   GET /api/v1/items/stats
export const getInventoryStats = async (req, res) => {
  const stats = await Item.aggregate([
    { $match: { shop: new mongoose.Types.ObjectId(req.shop.id) } },
    {
      $project: {
        totalQty: { $sum: "$batches.quantity" },
        alertQuantity: 1,
        isOutOfStock: {
          $cond: [{ $eq: [{ $sum: "$batches.quantity" }, 0] }, 1, 0],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ["$totalQty", "$alertQuantity"] }, 1, 0] },
        },
        outOfStockCount: { $sum: "$isOutOfStock" },
      },
    },
  ]);

  res.status(200).json({ success: true, stats: stats[0] });
};

// @desc    Resolve product info from public barcode databases (Open*Facts, UPCitemdb, …)
// @route   GET /api/v1/items/barcode-lookup/:barcode
export const lookupBarcodeProduct = async (req, res) => {
  try {
    let raw = req.params.barcode;
    try {
      raw = decodeURIComponent(String(raw || ""));
    } catch {
      raw = String(raw || "");
    }
    if (!raw || !String(raw).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Barcode is required." });
    }

    const cacheKey = `barcode:${String(raw).trim()}`;
    const cached = cache.get(cacheKey);
    if (cached?.source && cached?.data) {
      return res.status(200).json({
        success: true,
        cached: true,
        source: cached.source,
        data: cached.data,
      });
    }

    const lookup = await lookupBarcodeOnline(raw);
    if (!lookup.ok || !lookup.result) {
      return res.status(404).json({
        success: false,
        message:
          "No product information found for this barcode in Open*Facts or UPCitemdb.",
      });
    }

    const result = lookup.result;
    cache.set(cacheKey, result, 600_000);

    return res.status(200).json({
      success: true,
      cached: false,
      source: result.source,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};