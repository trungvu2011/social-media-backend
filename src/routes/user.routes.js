import express from "express";
import { getAllUsers, getProfile } from "../controllers/user.controller.js";
import { signUp, login } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.post("/signUp", signUp);
router.post("/login", login);
router.get("/profile", getProfile);
export default router;
