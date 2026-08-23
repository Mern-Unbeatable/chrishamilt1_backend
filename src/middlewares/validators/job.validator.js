const { body, param, query } = require("express-validator");

const createJobValidator = [
  body("title").trim().notEmpty().withMessage("Job title is required"),
  body("description").trim().notEmpty().withMessage("Job description is required"),
  body("categoryId").isUUID().withMessage("A valid category is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("city").optional().trim(),
  body("budgetMin").isFloat({ min: 0 }).withMessage("budgetMin must be a positive number"),
  body("budgetMax").isFloat({ min: 0 }).withMessage("budgetMax must be a positive number"),
  body("urgency")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH"])
    .withMessage("Urgency must be LOW, MEDIUM, or HIGH"),
  body("preferredStart").optional().isISO8601().withMessage("preferredStart must be a valid date"),
  body("completionBy").optional().isISO8601().withMessage("completionBy must be a valid date"),
  body("specialNotes").optional().isString(),
  body("scheduledAt").optional().isISO8601().withMessage("scheduledAt must be a valid date"),
  body("requirements").optional().isArray().withMessage("requirements must be an array of strings"),
  body("requirements.*").optional().isString(),
  body("images").optional().isArray().withMessage("images must be an array of URLs"),
  body("images.*").optional().isString(),
];

const updateJobValidator = [
  param("id").isUUID().withMessage("Invalid job id"),
  body("title").optional().trim().notEmpty(),
  body("description").optional().trim().notEmpty(),
  body("categoryId").optional().isUUID(),
  body("location").optional().trim().notEmpty(),
  body("city").optional().trim(),
  body("budgetMin").optional().isFloat({ min: 0 }),
  body("budgetMax").optional().isFloat({ min: 0 }),
  body("urgency").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
  body("preferredStart").optional().isISO8601(),
  body("completionBy").optional().isISO8601(),
  body("specialNotes").optional().isString(),
  body("scheduledAt").optional().isISO8601(),
  body("requirements").optional().isArray(),
  body("images").optional().isArray(),
];

const jobIdValidator = [param("id").isUUID().withMessage("Invalid job id")];

const browseJobsValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("category").optional().trim(),
  query("location").optional().trim(),
  query("search").optional().trim(),
  query("minBudget").optional().isFloat({ min: 0 }),
  query("maxBudget").optional().isFloat({ min: 0 }),
  query("urgency").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
  query("status").optional().isIn(["OPEN", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
];

module.exports = {
  createJobValidator,
  updateJobValidator,
  jobIdValidator,
  browseJobsValidator,
};
