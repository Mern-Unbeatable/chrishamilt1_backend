const express = require("express");
const tradesmanController = require("../controllers/tradesman.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  updateJobStatusValidator,
  listBookingsValidator,
} = require("../middlewares/validators/booking.validator");

const router = express.Router();

router.use(authenticate, authorize("TRADESMAN"));

router.get("/dashboard", tradesmanController.getDashboard);
router.get(
  "/earnings",
  listBookingsValidator,
  validate,
  tradesmanController.getEarnings
);
router.get("/jobs", tradesmanController.getMyAssignedJobs);
router.patch(
  "/jobs/:id/status",
  updateJobStatusValidator,
  validate,
  tradesmanController.updateAssignedJobStatus
);

module.exports = router;
