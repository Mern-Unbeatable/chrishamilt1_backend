const { body, param } = require("express-validator");

const iconValidator = body("icon")
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 64 })
  .withMessage("icon must be 64 characters or fewer")
  .matches(/^[a-zA-Z0-9-]*$/)
  .withMessage("icon must be a key like wrench or droplet");

const createCategoryValidator = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
  body("icon").trim().notEmpty().withMessage("Category icon is required"),
  body("icon")
    .isLength({ max: 64 })
    .withMessage("icon must be 64 characters or fewer")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("icon must be a key like wrench or droplet"),
];

const updateCategoryValidator = [
  param("id").isUUID().withMessage("Invalid category id"),
  body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty"),
  iconValidator,
];

const categoryIdValidator = [param("id").isUUID().withMessage("Invalid category id")];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator,
  categoryIdValidator,
};
