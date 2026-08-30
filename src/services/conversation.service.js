const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { serializeTradesman, serializeCustomer } = require("../utils/serialize");

const conversationInclude = {
  customer: true,
  tradesman: { include: { tradesmanProfile: true } },
  job: {
    select: { id: true, jobCode: true, title: true, status: true, location: true },
  },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
};

const serializeSender = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    firstName: user.firstName,
    profileImage: user.profileImage,
    role: user.role,
  };
};

const serializeMessage = (message) => {
  if (!message) return null;
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    isRead: message.isRead,
    createdAt: message.createdAt,
    sender: serializeSender(message.sender),
  };
};

const assertParticipant = (conversation, viewer) => {
  if (!viewer) {
    throw new ApiError(401, "Authentication required");
  }
  if (viewer.role === "ADMIN") return;
  if (viewer.id === conversation.customerId) return;
  if (viewer.id === conversation.tradesmanId) return;
  throw new ApiError(403, "You cannot access this conversation");
};

const serializeConversation = (conversation, viewerId, unreadCount = 0) => {
  if (!conversation) return null;
  const lastMessage = conversation.messages?.[0];

  return {
    id: conversation.id,
    jobId: conversation.jobId,
    customerId: conversation.customerId,
    tradesmanId: conversation.tradesmanId,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          content: lastMessage.content,
          isRead: lastMessage.isRead,
          createdAt: lastMessage.createdAt,
        }
      : null,
    job: conversation.job || null,
    customer: serializeCustomer(conversation.customer, { includeContact: true }),
    tradesman: serializeTradesman(conversation.tradesman),
    otherParty:
      viewerId === conversation.customerId
        ? serializeTradesman(conversation.tradesman)
        : serializeCustomer(conversation.customer, { includeContact: true }),
  };
};

const unreadCountsByConversation = async (conversationIds, viewerId) => {
  if (!conversationIds.length) return {};

  const grouped = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      isRead: false,
      senderId: { not: viewerId },
    },
    _count: { _all: true },
  });

  return Object.fromEntries(grouped.map((row) => [row.conversationId, row._count._all]));
};

const loadConversation = async (conversationId) => {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });
};

const ensureConversation = async ({ customerId, tradesmanId, jobId = null }) => {
  const existing = await prisma.conversation.findFirst({
    where: {
      customerId,
      tradesmanId,
      jobId: jobId || null,
    },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      customerId,
      tradesmanId,
      jobId: jobId || null,
    },
  });
};

const startConversation = async (viewer, { customerId, tradesmanId, jobId } = {}) => {
  let resolvedCustomerId = customerId;
  let resolvedTradesmanId = tradesmanId;

  if (viewer.role === "USER") {
    if (!tradesmanId) {
      throw new ApiError(400, "tradesmanId is required");
    }
    resolvedCustomerId = viewer.id;
    resolvedTradesmanId = tradesmanId;
  } else if (viewer.role === "TRADESMAN") {
    if (!customerId) {
      throw new ApiError(400, "customerId is required");
    }
    resolvedCustomerId = customerId;
    resolvedTradesmanId = viewer.id;
  } else if (viewer.role === "ADMIN") {
    if (!customerId || !tradesmanId) {
      throw new ApiError(400, "customerId and tradesmanId are required");
    }
  } else {
    throw new ApiError(403, "Only customers and tradesmen can start a chat");
  }

  const [customer, tradesman] = await Promise.all([
    prisma.user.findUnique({ where: { id: resolvedCustomerId } }),
    prisma.user.findUnique({ where: { id: resolvedTradesmanId } }),
  ]);

  if (!customer || customer.role !== "USER") {
    throw new ApiError(404, "Customer not found");
  }
  if (!tradesman || tradesman.role !== "TRADESMAN") {
    throw new ApiError(404, "Tradesman not found");
  }
  if (resolvedCustomerId === resolvedTradesmanId) {
    throw new ApiError(400, "You cannot start a chat with yourself");
  }

  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new ApiError(404, "Job not found");
    }
    if (job.customerId !== resolvedCustomerId) {
      throw new ApiError(400, "This job does not belong to that customer");
    }
  }

  const created = await ensureConversation({
    customerId: resolvedCustomerId,
    tradesmanId: resolvedTradesmanId,
    jobId: jobId || null,
  });

  const conversation = await loadConversation(created.id);
  return serializeConversation(conversation, viewer.id, 0);
};

const listConversations = async (viewer, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where =
    viewer.role === "ADMIN"
      ? {}
      : viewer.role === "TRADESMAN"
        ? { tradesmanId: viewer.id }
        : { customerId: viewer.id };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastMessageAt: "desc" },
      include: conversationInclude,
    }),
    prisma.conversation.count({ where }),
  ]);

  const unreadMap = await unreadCountsByConversation(
    conversations.map((item) => item.id),
    viewer.id
  );

  return {
    conversations: conversations.map((item) =>
      serializeConversation(item, viewer.id, unreadMap[item.id] || 0)
    ),
    total,
    page,
    limit,
  };
};

const getConversation = async (conversationId, viewer) => {
  const conversation = await loadConversation(conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  assertParticipant(conversation, viewer);

  const unreadMap = await unreadCountsByConversation([conversation.id], viewer.id);
  return serializeConversation(conversation, viewer.id, unreadMap[conversation.id] || 0);
};

const listMessages = async (conversationId, viewer, query = {}) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  assertParticipant(conversation, viewer);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 30;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { sender: true },
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);

  return {
    messages: messages.map(serializeMessage),
    total,
    page,
    limit,
  };
};

const sendMessage = async (viewer, conversationId, content) => {
  const text = String(content || "").trim();
  if (!text) {
    throw new ApiError(400, "Message content is required");
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  if (viewer.role === "ADMIN") {
    throw new ApiError(403, "Admins cannot send chat messages");
  }
  assertParticipant(conversation, viewer);

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: viewer.id,
        content: text,
      },
      include: { sender: true },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return message;
  });

  const refreshed = await loadConversation(conversationId);
  const recipientId =
    viewer.id === conversation.customerId ? conversation.tradesmanId : conversation.customerId;

  return {
    message: serializeMessage(created),
    conversation: serializeConversation(refreshed, recipientId, 1),
    recipientId,
  };
};

const markRead = async (conversationId, viewer) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }
  assertParticipant(conversation, viewer);

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: viewer.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  const refreshed = await loadConversation(conversationId);
  return serializeConversation(refreshed, viewer.id, 0);
};

module.exports = {
  ensureConversation,
  startConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  markRead,
};
