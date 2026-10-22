const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const quoteService = require("../services/quote.service");
const bookingService = require("../services/booking.service");
const env = require("../config/env");

const createQuote = asyncHandler(async (req, res) => {
  const checkout = await quoteService.createQuote(req.user.id, req.params.id, req.body);
  return success(res, {
    statusCode: 201,
    message: "Checkout created. Pay to submit this quote.",
    data: checkout,
  });
});

const confirmQuoteCheckout = asyncHandler(async (req, res) => {
  const sessionId = req.body.sessionId || req.query.session_id;
  const result = await quoteService.confirmQuoteCheckout(sessionId, req.user);
  return success(res, {
    message: result.alreadyCompleted ? "Quote payment already confirmed" : "Quote submitted successfully",
    data: result.quote,
  });
});

const stripeSuccess = asyncHandler(async (req, res) => {
  const sessionId = req.query.session_id;
  await quoteService.confirmQuoteCheckout(sessionId);
  const redirectTo =
    process.env.STRIPE_QUOTE_SUCCESS_URL ||
    `${env.frontendUrl.replace(/\/$/, "")}/quotes?status=success`;
  return res.redirect(redirectTo);
});

const listJobQuotes = asyncHandler(async (req, res) => {
  const quotes = await quoteService.listJobQuotes(req.params.id, req.user);
  return success(res, { message: "Job quotes fetched", data: quotes });
});

const getMyQuotes = asyncHandler(async (req, res) => {
  const result = await quoteService.getMyQuotes(req.user.id, req.query);
  return res.status(200).json({
    success: true,
    message: "My quotes fetched",
    total: result.total,
    data: result.quotes,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

const getQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.getQuoteById(req.params.id, req.user);
  return success(res, { message: "Quote details", data: quote });
});

const updateQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.updateQuote(req.params.id, req.user.id, req.body);
  return success(res, { message: "Quote updated", data: quote });
});

const withdrawQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.withdrawQuote(req.params.id, req.user.id);
  return success(res, { message: "Quote withdrawn", data: quote });
});

const hireQuote = asyncHandler(async (req, res) => {
  const booking = await bookingService.hireQuote(req.user.id, req.params.id);
  return success(res, {
    statusCode: 201,
    message: "Tradesman hired successfully",
    data: booking,
  });
});

module.exports = {
  createQuote,
  confirmQuoteCheckout,
  stripeSuccess,
  listJobQuotes,
  getMyQuotes,
  getQuote,
  updateQuote,
  withdrawQuote,
  hireQuote,
};
