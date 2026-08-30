const express = require("express");
const conversationController = require("../controllers/conversation.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  startConversationValidator,
  conversationIdValidator,
  listConversationsValidator,
  listMessagesValidator,
  sendMessageValidator,
} = require("../middlewares/validators/conversation.validator");

const router = express.Router();

router.use(authenticate, authorize("USER", "TRADESMAN", "ADMIN"));

router.get(
  "/",
  listConversationsValidator,
  validate,
  conversationController.listConversations
);

router.post(
  "/",
  authorize("USER", "TRADESMAN", "ADMIN"),
  startConversationValidator,
  validate,
  conversationController.startConversation
);

router.get(
  "/:id",
  conversationIdValidator,
  validate,
  conversationController.getConversation
);

router.get(
  "/:id/messages",
  listMessagesValidator,
  validate,
  conversationController.listMessages
);

router.post(
  "/:id/messages",
  authorize("USER", "TRADESMAN"),
  sendMessageValidator,
  validate,
  conversationController.sendMessage
);

router.patch(
  "/:id/read",
  conversationIdValidator,
  validate,
  conversationController.markRead
);

module.exports = router;
