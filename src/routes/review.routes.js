const express = require("express");
const reviewController = require("../controllers/review.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  createReviewValidator,
  replyReviewValidator,
  listReviewsValidator,
} = require("../middlewares/validators/review.validator");

const router = express.Router();

router.get(
  "/tradesman/:id",
  listReviewsValidator,
  validate,
  reviewController.listTradesmanReviews
);

router.use(authenticate);

router.get(
  "/mine",
  authorize("TRADESMAN"),
  listReviewsValidator,
  validate,
  reviewController.listMyReviews
);

router.post(
  "/",
  authorize("USER"),
  createReviewValidator,
  validate,
  reviewController.createReview
);

router.patch(
  "/:id/reply",
  authorize("TRADESMAN"),
  replyReviewValidator,
  validate,
  reviewController.replyToReview
);

module.exports = router;
