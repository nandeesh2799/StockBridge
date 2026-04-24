import express from "express";
import {
  addCustomer,
  getCustomers,
  updateCustomer,
  getCustomerHistory,
  scheduleReminder,
  getRemindersDue,
} from "../controllers/customer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/reminders-due", getRemindersDue);

router.route("/").get(getCustomers).post(addCustomer);

router.route("/:id").put(updateCustomer);

router.get("/:id/history", getCustomerHistory);
router.post("/:id/schedule-reminder", scheduleReminder);

export default router;
