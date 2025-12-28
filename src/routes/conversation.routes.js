import express from "express";
import {
  getMyConversations,
  getOrCreateConversation,
} from "../controllers/conversation.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getMyConversations);
router.post("/get-or-create", verifyToken, getOrCreateConversation);
export default router;
