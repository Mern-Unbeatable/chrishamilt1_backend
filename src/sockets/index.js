const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/prisma");
const conversationService = require("../services/conversation.service");

let ioInstance = null;

const socketAuth = async (socket, next) => {
  try {
    const header = socket.handshake.headers.authorization || "";
    const token =
      socket.handshake.auth?.token ||
      (header.startsWith("Bearer ") ? header.slice(7) : null);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return next(new Error("Account not found"));
    }
    if (user.status === "SUSPENDED") {
      return next(new Error("Account is suspended"));
    }

    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
};

const emitChatEvent = (target, event, payload) => {
  if (!ioInstance) return;
  const room = String(target).startsWith("user:") ? target : `conversation:${target}`;
  ioInstance.to(room).emit(event, payload);
};

const initSockets = (io) => {
  ioInstance = io;
  io.use(socketAuth);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("conversation:join", async (payload = {}, ack) => {
      try {
        const conversationId = payload.conversationId;
        await conversationService.getConversation(conversationId, socket.user);
        socket.join(`conversation:${conversationId}`);
        if (typeof ack === "function") ack({ success: true });
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on("conversation:leave", (payload = {}) => {
      if (payload.conversationId) {
        socket.leave(`conversation:${payload.conversationId}`);
      }
    });

    socket.on("message:send", async (payload = {}, ack) => {
      try {
        const result = await conversationService.sendMessage(
          socket.user,
          payload.conversationId,
          payload.content
        );

        io.to(`conversation:${payload.conversationId}`).emit("message:new", result.message);
        io.to(`user:${result.recipientId}`).emit(
          "conversation:updated",
          result.conversation
        );

        if (typeof ack === "function") {
          ack({ success: true, data: result.message });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on("message:read", async (payload = {}, ack) => {
      try {
        const conversation = await conversationService.markRead(
          payload.conversationId,
          socket.user
        );
        io.to(`conversation:${payload.conversationId}`).emit("message:read", {
          conversationId: payload.conversationId,
          readerId: socket.user.id,
        });
        if (typeof ack === "function") ack({ success: true, data: conversation });
      } catch (error) {
        if (typeof ack === "function") {
          ack({ success: false, message: error.message });
        }
      }
    });

    socket.on("typing:start", (payload = {}) => {
      if (!payload.conversationId) return;
      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId: socket.user.id,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (payload = {}) => {
      if (!payload.conversationId) return;
      socket.to(`conversation:${payload.conversationId}`).emit("typing", {
        conversationId: payload.conversationId,
        userId: socket.user.id,
        isTyping: false,
      });
    });
  });
};

module.exports = { initSockets, emitChatEvent };
