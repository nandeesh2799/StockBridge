import express from "express";
import { getGeminiInsights } from "../controllers/ai.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate", protect, getGeminiInsights);
router.post("/chat", protect, getGeminiInsights);

export default router;
