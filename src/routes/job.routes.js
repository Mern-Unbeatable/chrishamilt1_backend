const express = require("express");
const jobController = require("../controllers/job.controller");
const quoteController = require("../controllers/quote.controller");
const { authenticate, optionalAuth } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  createJobValidator,
  updateJobValidator,
  jobIdValidator,
  browseJobsValidator,
} = require("../middlewares/validators/job.validator");
const { createQuoteValidator } = require("../middlewares/validators/quote.validator");

const router = express.Router();

router.get("/", browseJobsValidator, validate, optionalAuth, jobController.browseJobs);
router.get("/mine", authenticate, authorize("USER", "ADMIN"), jobController.getMyJobs);
router.get(
  "/:id/quotes",
  authenticate,
  authorize("USER", "ADMIN"),
  jobIdValidator,
  validate,
  quoteController.listJobQuotes
);
router.post(
  "/:id/quotes",
  authenticate,
  authorize("TRADESMAN"),
  jobIdValidator,
  createQuoteValidator,
  validate,
  quoteController.createQuote
);
router.get("/:id", jobIdValidator, validate, optionalAuth, jobController.getJob);

router.post(
  "/",
  authenticate,
  authorize("USER"),
  createJobValidator,
  validate,
  jobController.createJob
);

router.put(
  "/:id",
  authenticate,
  authorize("USER", "ADMIN"),
  updateJobValidator,
  validate,
  jobController.updateJob
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorize("USER", "ADMIN"),
  jobIdValidator,
  validate,
  jobController.cancelJob
);

module.exports = router;
