import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";


// Routes
import aiRoutes from "./src/routes/ai.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import itemRoutes from "./src/routes/item.routes.js";
import customerRoutes from "./src/routes/customer.routes.js";
import saleRoutes from "./src/routes/sale.routes.js";
import uploadRoutes from "./src/routes/upload.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import expenseRoutes from "./src/routes/expense.routes.js";
import supplierRoutes from "./src/routes/supplier.routes.js";
import staffRoutes from "./src/routes/staff.routes.js";

// Middlewares
import { errorHandler } from "./src/middlewares/errorHandler.js";
import { apiLimiter } from "./src/middlewares/rateLimiter.js";

const app = express();
app.set("trust proxy", 1);

// 1. GLOBAL MIDDLEWARES
app.use(helmet());

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan("dev"));
app.use("/api", apiLimiter);

// 2. API ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/items", itemRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/sales", saleRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/ai", aiRoutes);

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "StockBridge Engine is live! 🚀" });
});

// 3. GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
