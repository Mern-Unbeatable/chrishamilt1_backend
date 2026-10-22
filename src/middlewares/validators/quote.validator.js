const { body, param, query } = require("express-validator");

const createQuoteValidator = [
  body("amount").isFloat({ min: 0 }).withMessage("Quote amount is required"),
  body("estimatedDuration").trim().notEmpty().withMessage("Estimated duration is required"),
  body("startDate").isISO8601().withMessage("Available start date is required"),
  body("materialsIncluded")
    .optional()
    .isBoolean()
    .withMessage("materialsIncluded must be a boolean"),
  body("warranty").optional().isString(),
  body("proposal").optional().isString(),
  body("images").optional().isArray().withMessage("images must be an array of URLs"),
  body("images.*").optional().isString(),
];

const updateQuoteValidator = [
  param("id").isUUID().withMessage("Invalid quote id"),
  body("amount").optional().isFloat({ min: 0 }),
  body("estimatedDuration").optional().trim().notEmpty(),
  body("startDate").optional().isISO8601(),
  body("materialsIncluded").optional().isBoolean(),
  body("warranty").optional().isString(),
  body("proposal").optional().isString(),
  body("images").optional().isArray(),
];

const quoteIdValidator = [param("id").isUUID().withMessage("Invalid quote id")];

const listQuotesValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("status").optional().isIn(["PENDING_PAYMENT", "SUBMITTED", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
];

const confirmQuoteCheckoutValidator = [
  body("sessionId").trim().notEmpty().withMessage("sessionId is required"),
];

module.exports = {
  createQuoteValidator,
  updateQuoteValidator,
  quoteIdValidator,
  listQuotesValidator,
  confirmQuoteCheckoutValidator,
};
