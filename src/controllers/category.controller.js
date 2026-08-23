const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const categoryService = require("../services/category.service");

const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories();
  return success(res, { message: "Categories fetched", data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body.name);
  return success(res, {
    statusCode: 201,
    message: "Category created",
    data: category,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return success(res, { message: "Category deleted" });
});

module.exports = { listCategories, createCategory, deleteCategory };
