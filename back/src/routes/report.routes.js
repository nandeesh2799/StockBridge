import express from "express";
import { getDashboardStats } from "../controllers/report.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/dashboard", getDashboardStats);

export default router;
