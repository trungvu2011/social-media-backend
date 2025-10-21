import express from "express";
import { getAllUsers, getProfile } from "../controllers/user.controller.js";
import { signUp, login } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", getAllUsers);
router.post("/signUp", signUp);
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);
export default router;
