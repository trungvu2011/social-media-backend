import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// Lấy hoặc tạo conversation
const getConversation = async (userId1, userId2) => {
  const members = [userId1, userId2].sort();

  let conversation = await Conversation.findOne({ members });
  if (!conversation) {
    conversation = await Conversation.create({ members });
  }

  return conversation;
};

export default function registerChatSocket(io, socket) {
  /**
   * SEND MESSAGE
   */
  socket.on("send_message", async ({ toUserId, content }) => {
    try {
      const conversation = await getConversation(socket.userId, toUserId);

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId: socket.userId,
        content,
        isDelivered: true,
      });

      conversation.lastMessage = newMessage._id;

      const [savedMessage] = await Promise.all([
        newMessage.save(),
        conversation.save(),
      ]);

      // gửi cho người nhận + các tab của mình
      io.to([toUserId, socket.userId]).emit("receive_message", savedMessage);
    } catch (err) {
      socket.emit("chat_error", {
        message: "Failed to send message",
      });
    }
  });

  /**
   * SEEN MESSAGE
   */
  socket.on("seen_message", async ({ conversationId }) => {
    try {
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: socket.userId },
          isSeen: false,
        },
        { $set: { isSeen: true } }
      );

      // Lấy conversation để xác định người còn lại
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      const otherUserId = conversation.members.find(
        (id) => id.toString() !== socket.userId
      );

      if (otherUserId) {
        io.to(otherUserId.toString()).emit("message_seen", {
          conversationId,
          userId: socket.userId,
        });
      }
    } catch (err) {
      console.error("Seen error:", err);
    }
  });

  /**
   * TYPING
   */
  socket.on("typing", ({ toUserId }) => {
    socket.to(toUserId).emit("typing", {
      fromUserId: socket.userId,
    });
  });
}
