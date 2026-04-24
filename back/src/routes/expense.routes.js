import express from "express";
import {
  addExpense,
  getExpenses,
  deleteExpense,
} from "../controllers/expense.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);
router.route("/").get(getExpenses).post(addExpense);
router.delete("/:id", authorize("owner", "manager"), deleteExpense);

export default router;
