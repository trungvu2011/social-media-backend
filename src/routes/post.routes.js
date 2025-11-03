import express from "express";
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getFollowedPosts,
} from "../controllers/post.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const router = express.Router();

// Middleware: kiem tra ObjectId hop le cho param :id
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    return next(new ApiError(400, "ID bài viết không hợp lệ"));
  }
  return next();
};

// Yeu cau xac thuc va cho phep upload nhieu anh qua truong 'images'
router.post(
  "/",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 10 }]),
  createPost
);
router.get("/", getAllPosts);
router.get("/followed", verifyToken, getFollowedPosts);
router.get("/:id", validateIdParam, getPostById);
router.put(
  "/:id",
  verifyToken,
  validateIdParam,
  upload.fields([{ name: "images", maxCount: 10 }]),
  updatePost
);
router.delete("/:id", verifyToken, validateIdParam, deletePost);

export default router;
