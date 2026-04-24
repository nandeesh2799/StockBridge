import express from "express";
import {
  addItem,
  getItems,
  updateItem,
  deleteItem,
  getInventoryStats,
} from "../controllers/item.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/stats", getInventoryStats);

router.route("/").get(getItems).post(authorize("owner", "manager"), addItem); // Cashier can't add items

router
  .route("/:id")
  .put(authorize("owner", "manager"), updateItem)
  .delete(authorize("owner"), deleteItem); // Only owner can delete

export default router;
