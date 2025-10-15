import express from "express";
import {
  createLike,
  getAllLikes,
  getLikeById,
  updateLike,
  deleteLike,
} from "../controllers/like.controller.js";

const router = express.Router();

router.post("/", createLike);
router.get("/", getAllLikes);
router.get("/:id", getLikeById);
router.put("/:id", updateLike);
router.delete("/:id", deleteLike);

export default router;
