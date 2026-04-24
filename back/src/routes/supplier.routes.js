import express from "express";
import {
  addSupplier,
  getSuppliers,
  updateSupplier,
  recordPurchase,
  deleteSupplier,
} from "../controllers/supplier.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);
router
  .route("/")
  .get(getSuppliers)
  .post(authorize("owner", "manager"), addSupplier);
router
  .route("/:id")
  .put(authorize("owner", "manager"), updateSupplier)
  .delete(authorize("owner"), deleteSupplier);
router.post("/:id/purchase", authorize("owner", "manager"), recordPurchase);

export default router;
