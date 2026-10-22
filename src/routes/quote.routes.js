const express = require("express");
const quoteController = require("../controllers/quote.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  updateQuoteValidator,
  quoteIdValidator,
  listQuotesValidator,
  confirmQuoteCheckoutValidator,
} = require("../middlewares/validators/quote.validator");
const { uploadJobImages } = require("../middlewares/upload.middleware");
const { parseQuoteForm } = require("../middlewares/parseJobForm.middleware");

const router = express.Router();

router.get("/stripe/success", quoteController.stripeSuccess);
router.post(
  "/confirm",
  authenticate,
  authorize("TRADESMAN"),
  confirmQuoteCheckoutValidator,
  validate,
  quoteController.confirmQuoteCheckout
);

router.get(
  "/mine",
  authenticate,
  authorize("TRADESMAN"),
  listQuotesValidator,
  validate,
  quoteController.getMyQuotes
);

router.get("/:id", authenticate, quoteIdValidator, validate, quoteController.getQuote);

router.put(
  "/:id",
  authenticate,
  authorize("TRADESMAN"),
  uploadJobImages,
  parseQuoteForm,
  updateQuoteValidator,
  validate,
  quoteController.updateQuote
);

router.patch(
  "/:id/withdraw",
  authenticate,
  authorize("TRADESMAN"),
  quoteIdValidator,
  validate,
  quoteController.withdrawQuote
);

router.post(
  "/:id/hire",
  authenticate,
  authorize("USER"),
  quoteIdValidator,
  validate,
  quoteController.hireQuote
);

module.exports = router;
