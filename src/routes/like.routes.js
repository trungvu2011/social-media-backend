import express from "express";
import {
  createLike,
  getAllLikes,
  getLikeById,
  updateLike,
  deleteLike,
} from "../controllers/like.controller.js";
import { ApiError } from "../utils/ApiError.js";

const router = express.Router();

// Middleware: yeu cau dang nhap (tuong thich req.userId va req.user._id)
const ensureAuth = (req, res, next) => {
  if (!req.user && req.userId) {
    req.user = { _id: req.userId };
  }
  if (req.user?._id || req.userId) {
    return next();
  }
  return next(new ApiError(401, "Bạn cần đăng nhập"));
};

// Middleware: kiem tra dinh dang ObjectId cho :id
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return next(new ApiError(400, "Định dạng ID không hợp lệ"));
  }
  return next();
};

// Middleware: kiem tra du lieu body khi tao like
const validateCreateBody = (req, res, next) => {
  const { targetType, targetId } = req.body;
  const allowed = ["post", "comment"];
  if (!allowed.includes(String(targetType || ""))) {
    return next(new ApiError(400, "Loại đối tượng không hợp lệ (post|comment)"));
  }
  if (!/^[0-9a-fA-F]{24}$/.test(String(targetId))) {
    return next(new ApiError(400, "ID đối tượng không hợp lệ"));
  }
  return next();
};

// Tao like moi
router.post("/", ensureAuth, validateCreateBody, createLike);

// Lay tat ca likes (ho tro query: targetType, targetId, userId)
router.get("/", getAllLikes);

// Lay chi tiet like
router.get("/:id", validateIdParam, getLikeById);

// Cap nhat like
router.put("/:id", ensureAuth, validateIdParam, updateLike);

// Xoa like
router.delete("/:id", ensureAuth, validateIdParam, deleteLike);

export default router;
