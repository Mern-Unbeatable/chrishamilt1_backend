const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/apiResponse");
const userService = require("../services/user.service");
const authService = require("../services/auth.service");

const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return success(res, { message: "Profile fetched", data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  return success(res, { message: "Profile updated", data: user });
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  return success(res, { message: "Password changed successfully" });
});

const listCustomers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await userService.listUsers({
    role: "USER",
    status: req.query.status,
    search: req.query.search,
    page,
    limit,
  });

  return paginated(res, {
    message: "Customers fetched",
    data: result.users,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await userService.getCustomerById(req.params.id);
  return success(res, { message: "Customer details", data: customer });
});

const listTradesmen = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await userService.listUsers({
    role: "TRADESMAN",
    status: req.query.status,
    search: req.query.search,
    page,
    limit,
  });

  return paginated(res, {
    message: "Tradesmen fetched",
    data: result.users,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const getTradesman = asyncHandler(async (req, res) => {
  const tradesman = await userService.getTradesmanById(req.params.id);
  return success(res, { message: "Tradesman details", data: tradesman });
});

const setAccountStatus = asyncHandler(async (req, res) => {
  const user = await userService.setAccountStatus(req.params.id, req.body.status);
  return success(res, { message: `Account ${req.body.status.toLowerCase()}`, data: user });
});

const grantTokens = asyncHandler(async (req, res) => {
  const user = await userService.grantTokens(req.params.id, Number(req.body.amount));
  return success(res, { message: "Tokens granted", data: user });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listCustomers,
  getCustomer,
  listTradesmen,
  getTradesman,
  setAccountStatus,
  grantTokens,
};
