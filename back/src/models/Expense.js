import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    category: {
      type: String,
      enum: [
        "Rent",
        "Salary",
        "Electricity",
        "Transport",
        "Maintenance",
        "Marketing",
        "Purchase",
        "Other",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Other"],
      default: "Cash",
    },
    receipt: { type: String, default: null }, // Image URL
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "addedByModel",
      default: null,
    },
    addedByModel: { type: String, enum: ["Shop", "Staff"], default: "Shop" },
  },
  { timestamps: true },
);

export default mongoose.model("Expense", expenseSchema);
