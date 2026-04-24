import express from "express";
import { createSale, getSales } from "../controllers/sale.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getSales).post(createSale);

export default router;
