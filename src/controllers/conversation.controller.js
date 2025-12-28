import Conversation from "../models/conversation.model.js";

// Lấy danh sách cuộc trò chuyện của người dùng
const getMyConversations = async (req, res) => {
  try {
    const userId = req.userId;

    const conversations = await Conversation.find({
      members: userId,
    })
      .populate("members", "userName avatar fullName")
      .populate({
        path: "lastMessage",
        select: "content senderId createdAt isSeen",
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Tạo hoặc lấy cuộc trò chuyện giữa 2 người
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (userId === otherUserId) {
      return res.status(400).json({
        message: "Cannot chat with yourself",
      });
    }

    const members = [userId, otherUserId].sort();

    let conversation = await Conversation.findOne({ members });

    if (!conversation) {
      conversation = await Conversation.create({ members });
    }

    res.json(conversation);
  } catch (err) {
    if (err.code === 11000) {
      // tránh lỗi tạo trùng
      const conversation = await Conversation.findOne({
        members: [req.userId, req.body.otherUserId].sort(),
      });
      return res.json(conversation);
    }

    res.status(500).json({ message: "Server error" });
  }
};

export { getMyConversations, getOrCreateConversation };
