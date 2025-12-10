import express from "express";
import {
  getProfile,
  signUp,
  login,
  updateUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  signOut,
  searchUsers,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

//sign up
router.post("/sign-up", signUp);
//login
router.post("/login", login);
//logout
router.post("/sign-out", verifyToken, signOut);
//refresh token
router.post("/refresh-token", refreshAccessToken);
//get profile
router.get("/profile/:id", verifyToken, getProfile);
//update user
router.put(
  "/profile",
  verifyToken,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "backgroundImage", maxCount: 1 },
  ]),
  updateUser
);

//forgot password
router.post("/forgot-password", forgotPassword);

//reset password
router.post("/reset-password", resetPassword);

//search user
router.get("/search", verifyToken, searchUsers);

export default router;
