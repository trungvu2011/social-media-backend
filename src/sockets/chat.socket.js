import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// Lấy hoặc tạo conversation
const getConversation = async (userId1, userId2) => {
  const members = [userId1, userId2].sort();
  const memberHash = members.join("_");

  const conversation = await Conversation.findOneAndUpdate(
    { memberHash },
    {
      $setOnInsert: {
        members,
        memberHash,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

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
      //log
      console.log("Message sent:", savedMessage);
      console.log("To user ID:", toUserId);
      console.log("Rooms hiện tại của socket:", socket.rooms);

      // gửi cho người nhận + các tab của mình
      const recipientRoom = `user:${toUserId}`;
      const senderRoom = `user:${socket.userId}`;
      io.to([recipientRoom, senderRoom]).emit("receive_message", savedMessage);

      // Populate conversation để emit đầy đủ thông tin
      const populatedConversation = await Conversation.findById(
        conversation._id
      )
        .populate("members", "userName avatar fullName")
        .populate({
          path: "lastMessage",
          select: "content senderId createdAt isSeen",
        });

      // Emit conversation updated để cập nhật danh sách conversation
      io.to([recipientRoom, senderRoom]).emit(
        "conversation_updated",
        populatedConversation
      );
    } catch (err) {
      socket.emit("chat_error", {
        message: "Failed to send message",
      });
      console.error("Send message error:", err);
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
        io.to(`user:${otherUserId.toString()}`).emit("message_seen", {
          conversationId,
          userId: socket.userId,
        });

        // Cập nhật conversation sau khi seen
        const populatedConversation = await Conversation.findById(
          conversationId
        )
          .populate("members", "userName avatar fullName")
          .populate({
            path: "lastMessage",
            select: "content senderId createdAt isSeen",
          });

        if (populatedConversation) {
          io.to([
            `user:${socket.userId}`,
            `user:${otherUserId.toString()}`,
          ]).emit("conversation_updated", populatedConversation);
        }
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
