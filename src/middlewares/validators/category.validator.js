const { body, param } = require("express-validator");

const createCategoryValidator = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
];

const categoryIdValidator = [param("id").isUUID().withMessage("Invalid category id")];

module.exports = { createCategoryValidator, categoryIdValidator };
