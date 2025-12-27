import { Server } from "socket.io";
import { authenticateSocket } from "../middlewares/socket.middleware.js";
import { SOCKET_EVENTS } from "../lib/socket.events.js";
import registerChatSocket from "../sockets/chat.socket.js";

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Event handlers
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Handle joining post rooms for real-time updates
    socket.on(SOCKET_EVENTS.JOIN_POST, (postId) => {
      socket.join(`post:${postId}`);
      console.log(`User ${socket.userId} joined post:${postId}`);
    });

    // Handle leaving post rooms
    socket.on(SOCKET_EVENTS.LEAVE_POST, (postId) => {
      socket.leave(`post:${postId}`);
      console.log(`User ${socket.userId} left post:${postId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });

    registerChatSocket(io, socket);
  });

  return io;
};
