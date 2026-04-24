import Item from "../models/Item.js";
import { cache } from "../utils/cache.js";
import Expense from "../models/Expense.js";

// @desc    Add a new item
// @route   POST /api/v1/items
export const addItem = async (req, res) => {
  try {
    const { name, category, unit, batches, alertQuantity, taxPercent, hsn } =
      req.body;

    const item = await Item.create({

      
      shop: req.shop.id,
      name,
      category,
      unit,
      batches,
      alertQuantity,
      taxPercent: taxPercent || 0,
      hsn: hsn || "",
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

    const { name, unit, batches, alertQuantity, taxPercent, hsn, adjustments } =
      req.body;

    if (name) item.name = name;
    if (unit) item.unit = unit;
    if (batches) item.batches = batches;
    if (alertQuantity !== undefined) item.alertQuantity = alertQuantity;
    if (taxPercent !== undefined) item.taxPercent = taxPercent;
    if (hsn !== undefined) item.hsn = hsn;
    if (adjustments) item.adjustments = adjustments;

    await item.save();

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