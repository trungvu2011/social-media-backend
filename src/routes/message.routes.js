import express from "express";
import {
  getMessages,
  markMessagesAsSeen,
} from "../controllers/message.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/:conversationId", verifyToken, getMessages);
router.post("/seen", verifyToken, markMessagesAsSeen);
export default router;
