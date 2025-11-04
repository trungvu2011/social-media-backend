import express from "express";
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getFollowedPosts,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment
} from "../controllers/post.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// Middleware: kiem tra ObjectId hop le cho param :id
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    // Avoid undefined ApiError; respond 400 directly
    return res.status(400).json({ message: "ID bài viết không hợp lệ" });
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

// Comment routes
router.post("/:id/comments", verifyToken, validateIdParam, addComment);
router.get("/:id/comments", validateIdParam, getComments);

router.post("/:id/like", verifyToken, validateIdParam, likePost);
router.delete("/:id/like", verifyToken, validateIdParam, unlikePost);
router.delete("/:id", verifyToken, validateIdParam, deletePost);
router.delete("/:id/comments/:commentId", verifyToken, validateIdParam, deleteComment);

export default router;
