const { body, param, query } = require("express-validator");

const createPackageValidator = [
  body("name").trim().notEmpty().withMessage("Package name is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("tokenQuantity")
    .isInt({ min: 1 })
    .withMessage("Token quantity must be a positive integer"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("stripePriceId")
    .trim()
    .notEmpty()
    .withMessage("stripePriceId is required")
    .matches(/^price_/)
    .withMessage("stripePriceId must be a Stripe price id"),
  body("badge").optional({ nullable: true }).isString(),
  body("isPopular").optional().isBoolean(),
  body("isActive").optional().isBoolean(),
];

const updatePackageValidator = [
  param("id").isUUID().withMessage("Invalid package id"),
  body("name").optional().trim().notEmpty(),
  body("price").optional().isFloat({ min: 0 }),
  body("tokenQuantity").optional().isInt({ min: 1 }),
  body("description").optional().trim().notEmpty(),
  body("stripePriceId")
    .optional()
    .trim()
    .matches(/^price_/)
    .withMessage("stripePriceId must be a Stripe price id"),
  body("badge").optional({ nullable: true }).isString(),
  body("isPopular").optional().isBoolean(),
  body("isActive").optional().isBoolean(),
];

const packageIdValidator = [param("id").isUUID().withMessage("Invalid package id")];

const confirmCheckoutValidator = [
  body("sessionId").optional().trim().notEmpty(),
  query("session_id").optional().trim().notEmpty(),
];

const listPurchasesValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("status").optional().isIn(["PENDING", "COMPLETED", "FAILED"]),
  query("search").optional().trim(),
];

module.exports = {
  createPackageValidator,
  updatePackageValidator,
  packageIdValidator,
  confirmCheckoutValidator,
  listPurchasesValidator,
};
