import jwt from "jsonwebtoken";
import Shop from "../models/Shop.js";
import Staff from "../models/Staff.js";

// 🔐 Protect middleware
export const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Extract token
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login.",
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⚡ Attach basic decoded data immediately (fast access)
    req.userId = decoded.id;
    req.role = decoded.role || "owner";

    // ===============================
    // 👤 STAFF FLOW
    // ===============================
    if (decoded.role && decoded.role !== "owner") {
      const staff = await Staff.findById(decoded.id).select("-pin").lean(); // ⚡ faster than normal mongoose doc

      if (!staff || !staff.isActive) {
        return res.status(401).json({
          success: false,
          message: "Staff account not found or deactivated.",
        });
      }

      req.shop = { id: staff.shop.toString() };
      req.staff = staff;
      req.role = staff.role;

      return next();
    }

    // ===============================
    // 🏪 OWNER FLOW
    // ===============================
    const shop = await Shop.findById(decoded.id)
      .select("_id name") // ⚡ fetch only required fields
      .lean();

    if (!shop) {
      return res.status(401).json({
        success: false,
        message: "Account not found.",
      });
    }

    req.shop = { id: shop._id.toString() };
    req.owner = shop;
    req.role = "owner";

    next();
  } catch (err) {
    console.error("Auth Error:", err.message);

    return res.status(401).json({
      success: false,
      message: "Token is invalid or expired. Please login again.",
    });
  }
};

// 🔐 Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    // ✅ Safety check
    if (!req.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Role not found.",
      });
    }

    if (!roles.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.role} cannot perform this action.`,
      });
    }

    next();
  };
};
