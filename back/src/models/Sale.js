import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        batchId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, default: "" },
        quantity: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        purchasePrice: { type: Number, required: true },
      },
    ],

    totalAmount: { type: Number, required: true },
    totalPurchasePrice: { type: Number, required: true },
    profit: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },

    paymentSplit: {
      cash: { type: Number, default: 0 },
      upi: { type: Number, default: 0 },
      credit: { type: Number, default: 0 },
    },

    invoiceNumber: { type: String, unique: true },
  },
  { timestamps: true },
);

saleSchema.pre("save", function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = `RF-${Date.now().toString().slice(-7)}`;
  }
  next();
});

// Compound indexes — critical for dashboard & filtered queries
saleSchema.index({ shop: 1, createdAt: -1 });
saleSchema.index({ shop: 1, customer: 1 });


export default mongoose.model("Sale", saleSchema);
