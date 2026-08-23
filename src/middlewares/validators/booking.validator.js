const { param, query, body } = require("express-validator");

const bookingIdValidator = [param("id").isUUID().withMessage("Invalid booking id")];

const listBookingsValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 }),
  query("status").optional().isIn(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
];

const updateJobStatusValidator = [
  param("id").isUUID().withMessage("Invalid job id"),
  body("status")
    .isIn(["ACCEPTED", "IN_PROGRESS", "COMPLETED"])
    .withMessage("Status must be ACCEPTED, IN_PROGRESS, or COMPLETED"),
];

module.exports = {
  bookingIdValidator,
  listBookingsValidator,
  updateJobStatusValidator,
};
