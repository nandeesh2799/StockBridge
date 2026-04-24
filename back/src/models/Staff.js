import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const staffSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["cashier", "manager"],
      default: "cashier",
    },
    pin: {
      type: String,
      required: true,
      minlength: 4,
      select: false, // Never returned in queries by default
    },
    isActive: { type: Boolean, default: true },
    permissions: {
      canAccessPOS: { type: Boolean, default: true },
      canAccessInventory: { type: Boolean, default: false },
      canAccessReports: { type: Boolean, default: false },
      canAccessKhata: { type: Boolean, default: false },
      canAccessExpenses: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Hash PIN before save
staffSchema.pre("save", async function (next) {
  if (!this.isModified("pin")) return next();
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

staffSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, shopId: this.shop },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }, // Staff sessions shorter than owner
  );
};

export default mongoose.model("Staff", staffSchema);
