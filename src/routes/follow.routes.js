import express from "express";
import {
  createFollow,
  getAllFollows,
  getFollowById,
  updateFollow,
  deleteFollow,
} from "../controllers/follow.controller.js";

const router = express.Router();

router.post("/", createFollow);
router.get("/", getAllFollows);
router.get("/:id", getFollowById);
router.put("/:id", updateFollow);
router.delete("/:id", deleteFollow);

export default router;
