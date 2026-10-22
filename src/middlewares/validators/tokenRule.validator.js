const { body, param } = require("express-validator");

const ruleIdValidator = [param("id").isUUID().withMessage("Invalid token rule id")];

const createRuleValidator = [
  body("name").trim().notEmpty().withMessage("Label is required"),
  body("minBudget").isFloat({ min: 0 }).withMessage("minBudget must be 0 or more"),
  body("maxBudget")
    .optional({ nullable: true })
    .custom((value) => value === null || value === "" || Number(value) >= 0)
    .withMessage("maxBudget must be 0 or more, or blank for unlimited"),
  body("tokenCost").isInt({ min: 1 }).withMessage("tokenCost must be at least 1"),
  body("price").isFloat({ min: 0.5 }).withMessage("price must be at least 0.50"),
  body("description").optional({ nullable: true }).isString(),
  body("isActive").optional().isBoolean(),
];

const updateRuleValidator = [
  param("id").isUUID().withMessage("Invalid token rule id"),
  body("name").optional().trim().notEmpty().withMessage("Label cannot be empty"),
  body("minBudget").optional().isFloat({ min: 0 }),
  body("maxBudget")
    .optional({ nullable: true })
    .custom((value) => value === null || value === "" || Number(value) >= 0)
    .withMessage("maxBudget must be 0 or more, or blank for unlimited"),
  body("tokenCost").optional().isInt({ min: 1 }),
  body("price").optional().isFloat({ min: 0.5 }).withMessage("price must be at least 0.50"),
  body("description").optional({ nullable: true }).isString(),
  body("isActive").optional().isBoolean(),
];

module.exports = {
  ruleIdValidator,
  createRuleValidator,
  updateRuleValidator,
};
