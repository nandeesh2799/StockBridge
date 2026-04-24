import Customer from "../models/Customer.js";

export const startReminderCron = () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const runReminders = async () => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const customersDue = await Customer.find({
        totalCredit: { $gt: 0 },
        nextReminderDate: { $lte: today },
      })
        .populate("shop", "shopName upiId") // Only fetch the 2 fields you actually use
        .lean(); // .lean() returns plain objects — much faster than Mongoose documents

      console.log(
        `\nStockBridge Reminder Cron: ${customersDue.length} reminders due today\n`,
      );

      const bulkUpdates = [];

      for (const customer of customersDue) {
        const shop = customer.shop;
        if (!shop || !shop.upiId) continue;

        const cleanPhone = customer.phone.replace(/\D/g, "").slice(-10);
        const upiLink = `upi://pay?pa=${shop.upiId}&pn=${shop.shopName}&am=${customer.totalCredit}&cu=INR`;

        const msg = `Namaste *${customer.name}* 🙏,\nAapka *${shop.shopName}* par ₹${customer.totalCredit} ka Credit baaki hai.\n\nKripya is link par click karke payment karein:\n${upiLink}\n\nDhanyawad! 🙏`;

        console.log(
          `📱 WhatsApp Reminder for ${customer.name} (${cleanPhone})`,
        );
        console.log(
          `   URL: https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}\n`,
        );

        bulkUpdates.push({
          updateOne: {
            filter: { _id: customer._id },
            update: {
              $set: {
                nextReminderDate: new Date(
                  Date.now() + 3 * 24 * 60 * 60 * 1000,
                ),
              },
            },
          },
        });
      }

      if (bulkUpdates.length > 0) {
        await Customer.bulkWrite(bulkUpdates);
      }
    } catch (error) {
      console.error("Reminder cron error:", error.message);
    }
  };

  runReminders();
  setInterval(runReminders, TWENTY_FOUR_HOURS);

  console.log("StockBridge reminder scheduler started");
};
