import express from "express";
import {
  getMessages,
  markMessagesAsSeen,
  getUnreadCount,
} from "../controllers/message.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/unread-count", verifyToken, getUnreadCount);
router.get("/:conversationId", verifyToken, getMessages);
router.post("/seen", verifyToken, markMessagesAsSeen);
export default router;
