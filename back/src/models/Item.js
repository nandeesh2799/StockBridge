import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      en: { type: String, required: true, trim: true },
      hi: { type: String, trim: true },
      kn: { type: String, trim: true },
    },
    category: {
      en: { type: String, default: "General" },
      hi: { type: String, default: "सामान्य" },
      kn: { type: String, default: "ಸಾಮಾನ್ಯ" },
    },
    unit: { type: String, required: true },

    taxPercent: { type: Number, default: 0 },
    hsn: { type: String, default: "" },
    barcode: {
      type: String,
      index: true,
      sparse: true,
      trim: true,
    },

    batches: [
      {
        batchNumber: String,
        purchasePrice: { type: Number, default: 0 },
        sellingPrice: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        expiryDate: Date,
        addedDate: { type: Date, default: Date.now },
      },
    ],

    alertQuantity: { type: Number, default: 10 },

    adjustments: [
      {
        type: { type: String, enum: ["add", "reduce", "expired", "damaged"] },
        quantity: Number,
        reason: String,
        date: { type: Date, default: Date.now },
      },
    ],

    // For supplier tracking
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
  },
  { timestamps: true },
);

itemSchema.index({ shop: 1, barcode: 1 }, { unique: true, sparse: true });

export default mongoose.model("Item", itemSchema);
