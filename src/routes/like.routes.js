import express from "express";
import {
  createLike,
  getAllLikes,
  getLikeById,
  updateLike,

  deleteLike,
  getLikedPostsByUser,
} from "../controllers/like.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Tao like moi
// Lay danh sach bai viet da like cua user
router.get("/user/:userId/posts", getLikedPostsByUser);

router.post("/", verifyToken, createLike);

// Lay tat ca likes (ho tro query: targetType, targetId, userId)
router.get("/", getAllLikes);

// Lay chi tiet like
router.get("/:id", verifyToken, getLikeById);

// Cap nhat like
router.put("/:id", verifyToken, updateLike);

// Xoa like
// Xoa like
router.delete("/:id", verifyToken, deleteLike);



export default router;
