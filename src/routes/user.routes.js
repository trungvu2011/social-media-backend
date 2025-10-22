import express from "express";
import {
  getProfile,
  signUp,
  login,
  updateUser,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/signUp", signUp);
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);
router.put(
  "/profile",
  verifyToken,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "backgroundImage", maxCount: 1 },
  ]),
  updateUser
);
export default router;
