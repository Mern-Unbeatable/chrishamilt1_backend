const asyncHandler = require("../utils/asyncHandler");
const { success, paginated } = require("../utils/apiResponse");
const bookingService = require("../services/booking.service");

const getMyBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getMyBookings(req.user.id, req.query);
  return paginated(res, {
    message: "My bookings fetched",
    data: result.bookings,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
});

const getBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user);
  return success(res, { message: "Order details", data: booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user);
  return success(res, { message: "Booking cancelled", data: booking });
});

module.exports = { getMyBookings, getBooking, cancelBooking };
