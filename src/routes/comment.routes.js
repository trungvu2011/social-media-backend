import express from "express";
import {
  createComment,
  getAllComments,
  getCommentById,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import { ApiError } from "../utils/ApiError.js";

const router = express.Router();

// Middleware: yêu cầu đăng nhập
const ensureAuth = (req, res, next) => {
  if (!req.user && req.userId) {
    req.user = { _id: req.userId };
  }
  if (req.user?._id || req.userId) {
    return next();
  }
  return next(new ApiError(401, "Bạn cần đăng nhập"));
};

// Middleware: kiểm tra định dạng ObjectId cho param :id
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return next(new ApiError(400, "ID bình luận không hợp lệ"));
  }
  return next();
};

// Middleware: bắt buộc và validate postId trong query cho GET /
const requireValidPostIdQuery = (req, res, next) => {
  const { postId } = req.query;
  if (!postId) {
    return next(new ApiError(400, "Cần truyền postId"));
  }
  if (!/^[0-9a-fA-F]{24}$/.test(String(postId))) {
    return next(new ApiError(400, "ID bài viết không hợp lệ"));
  }
  return next();
};

router.post("/", ensureAuth, createComment);
router.get("/", requireValidPostIdQuery, getAllComments);
router.get("/:id", validateIdParam, getCommentById);
router.put("/:id", ensureAuth, validateIdParam, updateComment);
router.delete("/:id", ensureAuth, validateIdParam, deleteComment);

export default router;
