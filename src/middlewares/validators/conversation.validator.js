const { body, param, query } = require("express-validator");

const startConversationValidator = [
  body("tradesmanId").optional().isUUID().withMessage("Invalid tradesman id"),
  body("customerId").optional().isUUID().withMessage("Invalid customer id"),
  body("jobId").optional().isUUID().withMessage("Invalid job id"),
];

const conversationIdValidator = [param("id").isUUID().withMessage("Invalid conversation id")];

const listConversationsValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];

const listMessagesValidator = [
  param("id").isUUID().withMessage("Invalid conversation id"),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];

const sendMessageValidator = [
  param("id").isUUID().withMessage("Invalid conversation id"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 2000 })
    .withMessage("Message cannot be longer than 2000 characters"),
];

module.exports = {
  startConversationValidator,
  conversationIdValidator,
  listConversationsValidator,
  listMessagesValidator,
  sendMessageValidator,
};
