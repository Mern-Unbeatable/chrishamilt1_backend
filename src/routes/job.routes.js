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
const { uploadJobImages } = require("../middlewares/upload.middleware");
const { parseJobForm, parseQuoteForm } = require("../middlewares/parseJobForm.middleware");

const router = express.Router();

router.get("/", browseJobsValidator, validate, optionalAuth, jobController.browseJobs);
router.get("/mine", authenticate, authorize("USER", "ADMIN"), jobController.getMyJobs);
router.get(
  "/:id/quotes",
  authenticate,
  authorize("USER", "TRADESMAN", "ADMIN"),
  jobIdValidator,
  validate,
  quoteController.listJobQuotes
);
router.post(
  "/:id/quotes",
  authenticate,
  authorize("TRADESMAN"),
  uploadJobImages,
  parseQuoteForm,
  jobIdValidator,
  createQuoteValidator,
  validate,
  quoteController.createQuote
);
router.get("/:id", authenticate, jobIdValidator, validate, jobController.getJob);

router.post(
  "/",
  authenticate,
  authorize("USER"),
  uploadJobImages,
  parseJobForm,
  createJobValidator,
  validate,
  jobController.createJob
);

router.put(
  "/:id",
  authenticate,
  authorize("USER", "ADMIN"),
  uploadJobImages,
  parseJobForm,
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

router.delete(
  "/:id",
  authenticate,
  authorize("USER", "ADMIN"),
  jobIdValidator,
  validate,
  jobController.deleteJob
);

module.exports = router;
