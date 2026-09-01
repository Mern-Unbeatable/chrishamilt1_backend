const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const adminService = require("../services/admin.service");

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await adminService.getDashboard();
  return success(res, { message: "Admin dashboard fetched", data: dashboard });
});

module.exports = { getDashboard };
