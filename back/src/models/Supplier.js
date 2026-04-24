import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    gstin: { type: String, default: "" },
    totalPurchased: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 }, // Amount owed TO supplier

    purchaseHistory: [
      {
        items: [
          {
            name: String,
            quantity: Number,
            unitCost: Number,
          },
        ],
        totalAmount: Number,
        amountPaid: Number,
        date: { type: Date, default: Date.now },
        invoiceNumber: String,
        notes: String,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Supplier", supplierSchema);
