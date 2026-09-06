const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const packageService = require("../services/package.service");
const env = require("../config/env");

const listPublicPackages = asyncHandler(async (req, res) => {
  const packages = await packageService.listPublicPackages();
  return res.status(200).json({
    success: true,
    message: "Packages fetched",
    total: packages.length,
    data: packages,
  });
});

const listAdminPackages = asyncHandler(async (req, res) => {
  const packages = await packageService.listAdminPackages();
  return res.status(200).json({
    success: true,
    message: "Packages fetched",
    total: packages.length,
    data: packages,
  });
});

const createPackage = asyncHandler(async (req, res) => {
  const pkg = await packageService.createPackage(req.body);
  return success(res, { statusCode: 201, message: "Package created", data: pkg });
});

const updatePackage = asyncHandler(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.body);
  return success(res, { message: "Package updated", data: pkg });
});

const deletePackage = asyncHandler(async (req, res) => {
  const result = await packageService.deletePackage(req.params.id);
  return success(res, {
    message: result.deleted ? "Package deleted" : "Package deactivated because it has purchases",
    data: result,
  });
});

const startCheckout = asyncHandler(async (req, res) => {
  const checkout = await packageService.startCheckout(req.user, req.params.id);
  return success(res, { statusCode: 201, message: "Checkout created", data: checkout });
});

const confirmCheckout = asyncHandler(async (req, res) => {
  const sessionId = req.body.sessionId || req.query.session_id;
  const result = await packageService.confirmCheckout(sessionId, req.user);
  return success(res, {
    message: result.alreadyCompleted ? "Payment already confirmed" : "Tokens added to wallet",
    data: result.purchase,
  });
});

const stripeSuccess = asyncHandler(async (req, res) => {
  const sessionId = req.query.session_id;
  await packageService.confirmCheckout(sessionId);
  const redirectTo = env.stripeSuccessUrl.includes("{CHECKOUT_SESSION_ID}")
    ? env.stripeSuccessUrl.replace("{CHECKOUT_SESSION_ID}", sessionId || "")
    : env.stripeSuccessUrl;
  return res.redirect(redirectTo);
});

const listMyPurchases = asyncHandler(async (req, res) => {
  const result = await packageService.listMyPurchases(req.user.id, req.query);
  return res.status(200).json({
    success: true,
    message: "Purchases fetched",
    total: result.total,
    data: result.purchases,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

const listAdminPurchases = asyncHandler(async (req, res) => {
  const result = await packageService.listAdminPurchases(req.query);
  return res.status(200).json({
    success: true,
    message: "Purchase history fetched",
    total: result.total,
    data: result.purchases,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

module.exports = {
  listPublicPackages,
  listAdminPackages,
  createPackage,
  updatePackage,
  deletePackage,
  startCheckout,
  confirmCheckout,
  stripeSuccess,
  listMyPurchases,
  listAdminPurchases,
};
