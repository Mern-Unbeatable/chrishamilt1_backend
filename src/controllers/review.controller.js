const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/apiResponse");
const reviewService = require("../services/review.service");

const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user.id, req.body);
  return success(res, {
    statusCode: 201,
    message: "Review submitted",
    data: review,
  });
});

const replyToReview = asyncHandler(async (req, res) => {
  const review = await reviewService.replyToReview(
    req.params.id,
    req.user.id,
    req.body.reply
  );
  return success(res, { message: "Reply posted", data: review });
});

const listMyReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listTradesmanReviews(req.user.id, req.query);
  return paginated(res, {
    message: "Reviews fetched",
    data: { summary: result.summary, reviews: result.reviews },
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const listTradesmanReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.listTradesmanReviews(req.params.id, req.query);
  return paginated(res, {
    message: "Tradesman reviews fetched",
    data: { summary: result.summary, reviews: result.reviews },
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

module.exports = {
  createReview,
  replyToReview,
  listMyReviews,
  listTradesmanReviews,
};
