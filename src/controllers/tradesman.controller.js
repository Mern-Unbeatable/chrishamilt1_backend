const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/apiResponse");
const tradesmanService = require("../services/tradesman.service");
const bookingService = require("../services/booking.service");

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await tradesmanService.getDashboard(req.user.id);
  return success(res, { message: "Dashboard fetched", data: dashboard });
});

const getEarnings = asyncHandler(async (req, res) => {
  const earnings = await tradesmanService.getEarnings(req.user.id, req.query);
  return success(res, { message: "Earnings fetched", data: earnings });
});

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await tradesmanService.getWallet(req.user.id);
  return success(res, { message: "Wallet fetched", data: wallet });
});

const getMyAssignedJobs = asyncHandler(async (req, res) => {
  const result = await bookingService.getTradesmanJobs(req.user.id, req.query);
  return paginated(res, {
    message: "My jobs fetched",
    data: result.jobs,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const updateAssignedJobStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateAssignedJobStatus(
    req.params.id,
    req.user.id,
    req.body.status
  );
  return success(res, { message: "Job status updated", data: booking });
});

module.exports = {
  getDashboard,
  getEarnings,
  getWallet,
  getMyAssignedJobs,
  updateAssignedJobStatus,
};
