import Staff from "../models/Staff.js";
import { cache } from "../utils/cache.js";

// @route   POST /api/v1/staff
export const addStaff = async (req, res) => {
  try {
    const { name, phone, role, pin, permissions } = req.body;

    if (!name || !phone || !pin) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and PIN are required.",
      });
    }

    if (pin.length < 4) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be at least 4 digits." });
    }

    const existing = await Staff.findOne({ phone }).lean();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A staff account with this phone already exists.",
      });
    }

    const staff = await Staff.create({
      shop: req.shop.id,
      name,
      phone,
      role: role || "cashier",
      pin,
      permissions: permissions || {},
    });

    cache.invalidate(`staff:${req.shop.id}`);

    const staffObj = staff.toObject();
    delete staffObj.pin;

    res.status(201).json({
      success: true,
      data: staffObj,
      message: `${name} added as ${role || "cashier"}!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/v1/staff
export const getStaff = async (req, res) => {
  try {
    const key = `staff:${req.shop.id}`;
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

    const staff = await Staff.find({ shop: req.shop.id })
      .sort("-createdAt")
      .lean();

    cache.set(key, staff, 120_000); // 2 min TTL — staff rarely changes

    res.status(200).json({ success: true, count: staff.length, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/v1/staff/:id
export const updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    const { name, role, isActive, permissions, pin } = req.body;

    if (name) staff.name = name;
    if (role) staff.role = role;
    if (isActive !== undefined) staff.isActive = isActive;
    if (permissions)
      staff.permissions = { ...staff.permissions, ...permissions };

    if (pin) {
      if (pin.length < 4)
        return res
          .status(400)
          .json({ success: false, message: "PIN must be at least 4 digits." });
      staff.pin = pin; 
    }

    await staff.save();

    cache.invalidate(`staff:${req.shop.id}`);

    const staffObj = staff.toObject();
    delete staffObj.pin;

    res
      .status(200)
      .json({ success: true, data: staffObj, message: "Staff updated!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/v1/staff/:id
export const removeStaff = async (req, res) => {
  try {
    const staff = await Staff.findOne({
      _id: req.params.id,
      shop: req.shop.id,
    });
    if (!staff)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    await staff.deleteOne();

    cache.invalidate(`staff:${req.shop.id}`);

    res.status(200).json({ success: true, message: "Staff removed." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
