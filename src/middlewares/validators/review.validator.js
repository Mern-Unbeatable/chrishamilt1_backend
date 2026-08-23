const { body, param, query } = require("express-validator");

const createReviewValidator = [
  body("jobId").isUUID().withMessage("A valid job id is required"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment").trim().notEmpty().withMessage("Review comment is required"),
];

const replyReviewValidator = [
  param("id").isUUID().withMessage("Invalid review id"),
  body("reply").trim().notEmpty().withMessage("Reply text is required"),
];

const listReviewsValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
];

module.exports = {
  createReviewValidator,
  replyReviewValidator,
  listReviewsValidator,
};
