import express from "express";
import {
  getProfileById,
  getProfileByUserName,
  getProfile,
  signUp,
  login,
  updateUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  signOut,
  googleLogin,
  getAllUsers,
  deleteUserByAdmin,
  getAdminStats,
  searchUsers,
} from "../controllers/user.controller.js";
import { verifyToken, isAdmin } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

//sign up
router.post("/sign-up", signUp);
//login
router.post("/login", login);
//google login
router.post("/google-login", googleLogin);
//logout
router.post("/sign-out", verifyToken, signOut);
//refresh token
router.post("/refresh-token", refreshAccessToken);
//get profile by user
router.get("/profile", verifyToken, getProfile);

//get profile by id
router.get("/:id/profile", getProfileById);
//get profile by username
router.get("/username/:username", getProfileByUserName);
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

// Admin routes
router.get("/", verifyToken, isAdmin, getAllUsers);
router.get("/stats", verifyToken, isAdmin, getAdminStats);
router.delete("/:id", verifyToken, isAdmin, deleteUserByAdmin);

//search user
router.get("/search", verifyToken, searchUsers);

export default router;
