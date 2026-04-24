import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/config/db.js";
import app from "./app.js";
import { startReminderCron } from "./src/utils/reminderCron.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    // Start WhatsApp reminder scheduler only after DB is available.
    startReminderCron();
    app.listen(PORT, () => {
      console.log(
        `StockBridge Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
