import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: "" },
    totalCredit: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    nextReminderDate: { type: Date, default: null },

    khataHistory: [
      {
        transactionType: {
          type: String,
          enum: ["CREDIT_GIVEN", "PAYMENT_RECEIVED", "GIVEN_UDHAAR"],
          required: true,
        },
        amount: { type: Number, required: true },
        description: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// Indexes
customerSchema.index({ shop: 1, totalCredit: 1, nextReminderDate: 1 }); // For reminders query
customerSchema.index({ shop: 1 });

export default mongoose.model("Customer", customerSchema);
