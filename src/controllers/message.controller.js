import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
/**
 *  GET /api/messages/:conversationId
 * Lấy danh sách tin nhắn
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    // kiểm tra quyền truy cập
    const conversation = await Conversation.findOne({
      _id: conversationId,
      members: userId,
    });

    if (!conversation) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      page: Number(page),
      limit: Number(limit),
      data: messages.reverse(), // hiển thị từ cũ → mới
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 *  POST /api/messages/seen
 * Đánh dấu tin nhắn đã xem
 */
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req.userId;

    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        isSeen: false,
      },
      { isSeen: true }
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/messages/unread-count
 * Đếm số conversation có tin nhắn chưa đọc
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    // Lấy danh sách conversation mà user là thành viên
    const conversations = await Conversation.find({
      members: userId,
    }).select('_id');

    const conversationIds = conversations.map(c => c._id);

    // Đếm số conversation có ít nhất 1 tin nhắn chưa đọc
    const conversationsWithUnread = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
          isSeen: false,
          isDeleted: false,
        }
      },
      {
        $group: {
          _id: "$conversationId"
        }
      },
      {
        $count: "count"
      }
    ]);

    const count = conversationsWithUnread.length > 0 ? conversationsWithUnread[0].count : 0;

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    res.status(500).json({ message: "Server error" });
  }
};
