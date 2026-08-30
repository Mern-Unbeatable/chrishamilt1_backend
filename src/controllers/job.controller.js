const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/apiResponse");
const jobService = require("../services/job.service");

const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.user.id, req.body);
  return success(res, {
    statusCode: 201,
    message: "Job posted successfully",
    data: job,
  });
});

const browseJobs = asyncHandler(async (req, res) => {
  const result = await jobService.browseJobs(req.query, req.user);
  return paginated(res, {
    message: "Jobs fetched",
    data: result.jobs,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id, req.user);
  return success(res, { message: "Job details", data: job });
});

const getMyJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getMyJobs(req.user.id, req.query);
  return paginated(res, {
    message: "My job posts",
    data: result.jobs,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.params.id, req.user, req.body);
  return success(res, { message: "Job updated", data: job });
});

const cancelJob = asyncHandler(async (req, res) => {
  const job = await jobService.cancelJob(req.params.id, req.user);
  return success(res, { message: "Job cancelled", data: job });
});

const deleteJob = asyncHandler(async (req, res) => {
  const result = await jobService.deleteJob(req.params.id, req.user);
  return success(res, { message: "Job deleted", data: result });
});

module.exports = {
  createJob,
  browseJobs,
  getJob,
  getMyJobs,
  updateJob,
  cancelJob,
  deleteJob,
};
