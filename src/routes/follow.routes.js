import express from "express";
import {
  createFollow,
  getAllFollowers,
  getAllFollowing,
  deleteFollow,
} from "../controllers/follow.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Theo dõi người khác
router.post("/", verifyToken, createFollow);
// Lấy tất cả người đang theo dõi mình
router.get("/followers/:userId", getAllFollowers);
//Lấy tất cả người mình theo dõi
router.get("/following/:userId", getAllFollowing);
// Xóa theo dõi
router.delete("/:userId", verifyToken, deleteFollow);

export default router;
