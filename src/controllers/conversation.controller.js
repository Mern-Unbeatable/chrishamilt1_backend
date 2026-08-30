const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const conversationService = require("../services/conversation.service");
const { emitChatEvent } = require("../sockets");

const listConversations = asyncHandler(async (req, res) => {
  const result = await conversationService.listConversations(req.user, req.query);
  return res.status(200).json({
    success: true,
    message: "Conversations fetched",
    total: result.total,
    data: result.conversations,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

const startConversation = asyncHandler(async (req, res) => {
  const conversation = await conversationService.startConversation(req.user, req.body);
  return success(res, {
    statusCode: 201,
    message: "Conversation ready",
    data: conversation,
  });
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversation(req.params.id, req.user);
  return success(res, { message: "Conversation fetched", data: conversation });
});

const listMessages = asyncHandler(async (req, res) => {
  const result = await conversationService.listMessages(req.params.id, req.user, req.query);
  return res.status(200).json({
    success: true,
    message: "Messages fetched",
    total: result.total,
    data: result.messages,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const result = await conversationService.sendMessage(
    req.user,
    req.params.id,
    req.body.content
  );

  emitChatEvent(result.message.conversationId, "message:new", result.message);
  emitChatEvent(`user:${result.recipientId}`, "conversation:updated", result.conversation);

  return success(res, {
    statusCode: 201,
    message: "Message sent",
    data: result.message,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const conversation = await conversationService.markRead(req.params.id, req.user);
  emitChatEvent(req.params.id, "message:read", {
    conversationId: req.params.id,
    readerId: req.user.id,
  });
  return success(res, { message: "Messages marked as read", data: conversation });
});

module.exports = {
  listConversations,
  startConversation,
  getConversation,
  listMessages,
  sendMessage,
  markRead,
};
