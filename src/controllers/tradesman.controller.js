const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const tradesmanService = require("../services/tradesman.service");
const bookingService = require("../services/booking.service");
const jobService = require("../services/job.service");

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
  const [result, purchasedJobs] = await Promise.all([
    bookingService.getTradesmanJobs(req.user.id, req.query),
    jobService.listPurchasedJobs(req.user.id),
  ]);

  return res.status(200).json({
    success: true,
    message: "My jobs fetched",
    data: result.jobs,
    purchasedJobs,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit) || 0,
    },
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
