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
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: { type: String, default: "General" },
    unit: { type: String, required: true },

    taxPercent: { type: Number, default: 0 },
    hsn: { type: String, default: "" },

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
export default mongoose.model("Item", itemSchema);
