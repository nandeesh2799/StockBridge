import Supplier from "../models/Supplier.js";
import Item from "../models/Item.js";
import { cache } from "../utils/cache.js";

// @route   POST /api/v1/suppliers
export const addSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, gstin } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Name and phone are required." });
    }

    const supplier = await Supplier.create({
      shop: req.shop.id,
      name,
      phone,
      email: email || "",
      address: address || "",
      gstin: gstin || "",
    });

    cache.invalidate(`suppliers:${req.shop.id}`);

    res
      .status(201)
      .json({ success: true, data: supplier, message: "Supplier added!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/v1/suppliers
export const getSuppliers = async (req, res) => {
  try {
    const key = `suppliers:${req.shop.id}`;
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

    const suppliers = await Supplier.find({ shop: req.shop.id })
      .sort("-createdAt")
      .lean();

    cache.set(key, suppliers, 60_000);

    res
      .status(200)
      .json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/v1/suppliers/:id
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found." });

    const allowed = ["name", "phone", "email", "address", "gstin"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) supplier[field] = req.body[field];
    });

    await supplier.save();

    cache.invalidate(`suppliers:${req.shop.id}`);

    res
      .status(200)
      .json({ success: true, data: supplier, message: "Supplier updated!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/v1/suppliers/:id/purchase
// Records a purchase order from this supplier + updates item stock
export const recordPurchase = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found." });

    const { items, totalAmount, amountPaid, invoiceNumber, notes } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one item is required." });
    }

    // OPTIMIZED: Fetch all items in ONE query instead of one per loop iteration
    const itemIds = items.filter((i) => i.itemId).map((i) => i.itemId);

    const dbItems = await Item.find({
      _id: { $in: itemIds },
      shop: req.shop.id,
    });

    const itemMap = {};
    dbItems.forEach((item) => {
      itemMap[item._id.toString()] = item;
    });

    // Update batches in memory
    for (const purchasedItem of items) {
      if (!purchasedItem.itemId) continue;
      const item = itemMap[purchasedItem.itemId.toString()];
      if (!item) continue;

      item.batches.push({
        purchasePrice: purchasedItem.unitCost,
        sellingPrice: item.batches?.[0]?.sellingPrice || 0,
        quantity: purchasedItem.quantity,
        addedDate: new Date(),
      });
      item.supplier = supplier._id;
    }

    // Save all items in parallel
    await Promise.all(dbItems.map((item) => item.save()));

    // Log purchase on supplier
    supplier.purchaseHistory.push({
      items,
      totalAmount,
      amountPaid: amountPaid || 0,
      invoiceNumber: invoiceNumber || "",
      notes: notes || "",
    });

    supplier.totalPurchased += totalAmount;
    supplier.totalDue += totalAmount - (amountPaid || 0);

    await supplier.save();

    // Invalidate caches
    cache.invalidate(`suppliers:${req.shop.id}`);
    cache.invalidate(`items:${req.shop.id}`);

    res.status(201).json({
      success: true,
      data: supplier,
      message: "Purchase recorded and stock updated!",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/v1/suppliers/:id
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found." });

    await supplier.deleteOne();

    cache.invalidate(`suppliers:${req.shop.id}`);

    res.status(200).json({ success: true, message: "Supplier deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
