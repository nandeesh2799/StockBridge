import express from "express";
import {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);
router.route("/").get(getExpenses).post(addExpense);
router.put("/:id", authorize("owner", "manager"), updateExpense);
router.delete("/:id", authorize("owner", "manager"), deleteExpense);

export default router;
