const express = require("express");
const bookingController = require("../controllers/booking.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  bookingIdValidator,
  listBookingsValidator,
} = require("../middlewares/validators/booking.validator");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("USER"),
  listBookingsValidator,
  validate,
  bookingController.getMyBookings
);

router.get("/:id", bookingIdValidator, validate, bookingController.getBooking);

router.patch(
  "/:id/cancel",
  authorize("USER", "ADMIN"),
  bookingIdValidator,
  validate,
  bookingController.cancelBooking
);

module.exports = router;
