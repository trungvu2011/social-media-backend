import express from "express";
import {
  createLike,
  getAllLikes,
  getLikeById,
  updateLike,
  deleteLike,
} from "../controllers/like.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Tao like moi
router.post("/", verifyToken, createLike);

// Lay tat ca likes (ho tro query: targetType, targetId, userId)
router.get("/", getAllLikes);

// Lay chi tiet like
router.get("/:id", verifyToken, getLikeById);

// Cap nhat like
router.put("/:id", verifyToken, updateLike);

// Xoa like
router.delete("/:id", verifyToken, deleteLike);

export default router;
