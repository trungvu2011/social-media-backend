import express from "express";
import {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";


import upload from "../middlewares/upload.middleware.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Middleware: kiểm tra định dạng ObjectId cho param :id

// Middleware: kiểm tra định dạng ObjectId cho param :id
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return res.status(400).json({ message: "ID bình luận không hợp lệ" });
  }
  return next();
};

// Middleware: bắt buộc và validate postId trong query cho GET /
const requireValidPostIdQuery = (req, res, next) => {
  const { postId } = req.query;
  if (!postId) {
    return res.status(400).json({ message: "Cần truyền postId" });
  }
  if (!/^[0-9a-fA-F]{24}$/.test(String(postId))) {
    return res.status(400).json({ message: "ID bài viết không hợp lệ" });
  }
  return next();
};

router.post("/", verifyToken, upload.single("image"), createComment);
router.get("/", requireValidPostIdQuery, getAllComments);
router.get("/:id", validateIdParam, getCommentById);
router.put("/:id", verifyToken, validateIdParam, updateComment);
router.delete("/:id", verifyToken, validateIdParam, deleteComment);

export default router;
