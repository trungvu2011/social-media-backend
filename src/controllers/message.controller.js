import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
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
