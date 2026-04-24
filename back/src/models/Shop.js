import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const shopSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    shopName: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    phone: { type: String, required: [true, "Phone number is required"] },
    avatar: { type: String, default: null },

    //OTP Fields for Login
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // --- Business Settings Fields ---
    address: { type: String, default: "" },
    gstEnabled: { type: Boolean, default: false },
    gst: { type: String, default: "" },
    upiId: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    signatoryName: { type: String, default: "" },
    designation: { type: String, default: "" },
    logo: { type: String, default: null },
    signature: { type: String, default: null },
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Password Hashing
shopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// JWT Token Generation
shopSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_IN || "7d"
  });
};

// Password Comparison
shopSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
