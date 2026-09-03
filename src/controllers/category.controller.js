const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const categoryService = require("../services/category.service");

const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories();
  return res.status(200).json({
    success: true,
    message: "Categories fetched",
    totalCategories: categories.length,
    data: categories,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return success(res, {
    statusCode: 201,
    message: "Category created",
    data: category,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return success(res, { message: "Category updated", data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return success(res, { message: "Category deleted" });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
