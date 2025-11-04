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
  deleteComment,
} from "../controllers/post.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

// Yeu cau xac thuc va cho phep upload nhieu anh qua truong 'images'
router.post(
  "/",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 10 }]),
  createPost
);
router.get("/", getAllPosts);
router.get("/followed", verifyToken, getFollowedPosts);
router.get("/:id", getPostById);
router.put(
  "/:id",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 10 }]),
  updatePost
);

// Comment routes
router.post("/:id/comments", verifyToken, addComment);
router.get("/:id/comments", getComments);

router.post("/:id/like", verifyToken, likePost);
router.delete("/:id/like", verifyToken, unlikePost);
router.delete("/:id", verifyToken, deletePost);
router.delete("/:id/comments/:commentId", verifyToken, deleteComment);

export default router;
