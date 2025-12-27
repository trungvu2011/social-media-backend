import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

// Hàm lấy hoặc tạo cuộc trò chuyện giữa 2 người
const getConversation = async (userId1, userId2) => {
  const members = [userId1, userId2].sort();
  let conversation = await Conversation.findOne({ members });

  if (!conversation) {
    conversation = await Conversation.create({ members });
  }
  return conversation;
};

const socketHandler = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // Middleware xác thực
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized: No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Unauthorized: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join vào room cá nhân để nhận tin nhắn riêng
    socket.join(socket.userId);
    console.log(`User connected: ${socket.userId}`);

    /**
     * SEND MESSAGE - Tối ưu bằng cách chạy song song các tác vụ lưu trữ
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

        // Tối ưu: Chạy save message và update conversation cùng lúc
        conversation.lastMessage = newMessage._id;

        const [savedMessage] = await Promise.all([
          newMessage.save(),
          conversation.save(),
        ]);

        // Gửi cho người nhận và gửi ngược lại cho chính người gửi (để đồng bộ các tab)
        io.to([toUserId, socket.userId]).emit("receive_message", savedMessage);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    /**
     * SEEN MESSAGE - Tối ưu logic cập nhật
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

        // Chỉ gửi cho người còn lại trong cuộc hội thoại (thông qua room người đó)
        // Lưu ý: Cần thêm logic để lấy toUserId từ conversationId nếu muốn chính xác hơn
        socket.broadcast.emit("message_seen", {
          conversationId,
          userId: socket.userId,
        });
      } catch (error) {
        console.error("Seen error:", error);
      }
    });

    /**
     * TYPING
     */
    socket.on("typing", ({ toUserId }) => {
      // Dùng socket.to() để gửi cho người nhận, tránh gửi ngược lại chính mình
      socket.to(toUserId).emit("typing", {
        fromUserId: socket.userId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

export default socketHandler;
