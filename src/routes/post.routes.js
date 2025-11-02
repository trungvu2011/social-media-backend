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

const router = express.Router();

// Require auth and allow multiple images upload via 'images' field
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
router.delete("/:id", verifyToken, deletePost);

export default router;
