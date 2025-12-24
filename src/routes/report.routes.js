import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import { createReport, getReports, updateReportStatus } from "../controllers/report.controller.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.get("/", verifyToken, isAdmin, getReports);
router.patch("/:id", verifyToken, isAdmin, updateReportStatus);

export default router;
