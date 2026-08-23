const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const authService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return success(res, {
    statusCode: 201,
    message: "Account created successfully",
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return success(res, {
    message: "Logged in successfully",
    data: result,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return success(res, {
    message: "Current user",
    data: user,
  });
});

module.exports = { register, login, me };
