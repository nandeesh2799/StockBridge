import express from "express";
import {
  addStaff,
  getStaff,
  updateStaff,
  removeStaff,
} from "../controllers/staff.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect);
router
  .route("/")
  .get(authorize("owner"), getStaff)
  .post(authorize("owner"), addStaff);
router
  .route("/:id")
  .put(authorize("owner"), updateStaff)
  .delete(authorize("owner"), removeStaff);

export default router;
