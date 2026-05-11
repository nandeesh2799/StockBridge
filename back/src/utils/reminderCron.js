import Customer from "../models/Customer.js";

export const startReminderCron = () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const runReminders = async () => {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const customersDue = await Customer.find({
        totalCredit: { $gt: 0 },
        nextReminderDate: { $ne: null, $lte: today },
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

        const dateStr = new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const message = 
          `==========================\n` +
          `*${shop.shopName.toUpperCase()}*\n` +
          `ACCOUNT STATEMENT\n` +
          `==========================\n` +
          `Customer Name : ${customer.name}\n` +
          `Statement Date: ${dateStr}\n` +
          `--------------------------\n` +
          `CURRENT OUTSTANDING BALANCE:\n` +
          `*INR ${customer.totalCredit.toFixed(2)}*\n` +
          `--------------------------\n` +
          `This is a formal notification regarding your pending balance at ${shop.shopName}. Please facilitate payment at your earliest convenience.\n\n` +
          `DIRECT UPI SETTLEMENT LINK:\n${upiLink}\n\n` +
          `--------------------------\n` +
          `Thank you for your cooperation.\n\n` +
          `Regards,\n` +
          `Accounts Management\n` +
          `${shop.shopName}\n` +
          `--------------------------\n` +
          `POWERED BY STOCKBRIDGE\n` +
          `==========================`;

        console.log(
          `WhatsApp Reminder for ${customer.name} (${cleanPhone})`,
        );
        console.log(
          `   URL: https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}\n`,
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
