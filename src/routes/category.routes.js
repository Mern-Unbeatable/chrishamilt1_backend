const express = require("express");
const categoryController = require("../controllers/category.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  createCategoryValidator,
  categoryIdValidator,
} = require("../middlewares/validators/category.validator");

const router = express.Router();

router.get("/", categoryController.listCategories);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createCategoryValidator,
  validate,
  categoryController.createCategory
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  categoryIdValidator,
  validate,
  categoryController.deleteCategory
);

module.exports = router;
