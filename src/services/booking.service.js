const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");
const { serializeTradesman, serializeCustomer } = require("../utils/serialize");
const { ensureConversation } = require("./conversation.service");

const bookingInclude = {
  job: {
    include: {
      category: true,
      images: true,
      requirements: true,
    },
  },
  quote: true,
  customer: true,
  tradesman: { include: { tradesmanProfile: true } },
};

const serializeBooking = (booking, { includeCustomerContact = false } = {}) => {
  if (!booking) return null;

  return {
    id: booking.id,
    jobId: booking.jobId,
    quoteId: booking.quoteId,
    customerId: booking.customerId,
    tradesmanId: booking.tradesmanId,
    price: toNumber(booking.price),
    scheduledAt: booking.scheduledAt,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    job: booking.job
      ? {
          id: booking.job.id,
          jobCode: booking.job.jobCode,
          title: booking.job.title,
          description: booking.job.description,
          location: booking.job.location,
          city: booking.job.city,
          status: booking.job.status,
          urgency: booking.job.urgency,
          preferredStart: booking.job.preferredStart,
          completionBy: booking.job.completionBy,
          specialNotes: booking.job.specialNotes,
          category: booking.job.category,
          images: booking.job.images || [],
          requirements: booking.job.requirements || [],
        }
      : undefined,
    quote: booking.quote
      ? {
          id: booking.quote.id,
          amount: toNumber(booking.quote.amount),
          estimatedDuration: booking.quote.estimatedDuration,
          startDate: booking.quote.startDate,
          materialsIncluded: booking.quote.materialsIncluded,
          warranty: booking.quote.warranty,
          proposal: booking.quote.proposal,
        }
      : undefined,
    customer: serializeCustomer(booking.customer, { includeContact: includeCustomerContact }),
    tradesman: serializeTradesman(booking.tradesman),
  };
};

const assertBookingAccess = (booking, viewer) => {
  if (viewer.role === "ADMIN") return;
  if (viewer.id === booking.customerId) return;
  if (viewer.id === booking.tradesmanId) return;
  throw new ApiError(403, "You cannot view this booking");
};

const hireQuote = async (customerId, quoteId) => {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { job: true, booking: true },
  });

  if (!quote) {
    throw new ApiError(404, "Quote not found");
  }
  if (quote.job.customerId !== customerId) {
    throw new ApiError(403, "You can only hire on your own jobs");
  }
  if (quote.job.status !== "OPEN") {
    throw new ApiError(400, "This job is no longer open for hiring");
  }
  if (quote.status !== "SUBMITTED") {
    throw new ApiError(400, "Only submitted quotes can be hired");
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        jobId: quote.jobId,
        quoteId: quote.id,
        customerId,
        tradesmanId: quote.tradesmanId,
        price: quote.amount,
        scheduledAt: quote.startDate,
        status: "ACCEPTED",
      },
      include: bookingInclude,
    });

    await tx.job.update({
      where: { id: quote.jobId },
      data: {
        status: "ACCEPTED",
        tradesmanId: quote.tradesmanId,
        scheduledAt: quote.startDate,
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "ACCEPTED" },
    });

    await tx.quote.updateMany({
      where: {
        jobId: quote.jobId,
        id: { not: quote.id },
        status: "SUBMITTED",
      },
      data: { status: "REJECTED" },
    });

    return tx.booking.findUnique({
      where: { id: created.id },
      include: bookingInclude,
    });
  });

  await ensureConversation({
    customerId,
    tradesmanId: quote.tradesmanId,
    jobId: quote.jobId,
  });

  return serializeBooking(booking, { includeCustomerContact: true });
};

// Get all bookings for a customer
const getMyBookings = async (customerId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {
    customerId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((booking) => serializeBooking(booking)),
    total,
    page,
    limit,
  };
};

const getBookingById = async (bookingId, viewer) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude,
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  assertBookingAccess(booking, viewer);

  return serializeBooking(booking, {
    includeCustomerContact: viewer.role === "ADMIN" || viewer.id === booking.tradesmanId,
  });
};

const cancelBooking = async (bookingId, viewer) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { job: true },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }
  if (viewer.role !== "ADMIN" && viewer.id !== booking.customerId) {
    throw new ApiError(403, "You can only cancel your own bookings");
  }
  if (!["ACCEPTED", "IN_PROGRESS"].includes(booking.status)) {
    throw new ApiError(400, "This booking can no longer be cancelled");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
      include: bookingInclude,
    });

    await tx.job.update({
      where: { id: booking.jobId },
      data: { status: "CANCELLED" },
    });

    return cancelled;
  });

  return serializeBooking(updated, { includeCustomerContact: true });
};

const getTradesmanJobs = async (tradesmanId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {
    tradesmanId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: bookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    jobs: bookings.map((booking) => ({
      id: booking.job?.id,
      bookingId: booking.id,
      jobCode: booking.job?.jobCode,
      title: booking.job?.title,
      customerName: booking.customer?.fullName,
      phoneNumber: booking.customer?.phoneNumber,
      price: toNumber(booking.price),
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      location: booking.job?.location,
    })),
    total,
    page,
    limit,
  };
};

const allowedTransitions = {
  ACCEPTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

const updateAssignedJobStatus = async (jobId, tradesmanId, status) => {
  const booking = await prisma.booking.findUnique({
    where: { jobId },
    include: bookingInclude,
  });

  if (!booking) {
    throw new ApiError(404, "Assigned job not found");
  }
  if (booking.tradesmanId !== tradesmanId) {
    throw new ApiError(403, "You can only update your assigned jobs");
  }

  const allowed = allowedTransitions[booking.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot change status from ${booking.status} to ${status}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { status },
      include: bookingInclude,
    });

    await tx.job.update({
      where: { id: jobId },
      data: { status },
    });

    if (status === "COMPLETED") {
      await tx.earning.create({
        data: {
          tradesmanId,
          jobId,
          amount: booking.price,
        },
      });

      await tx.tradesmanProfile.updateMany({
        where: { userId: tradesmanId },
        data: { jobsCompleted: { increment: 1 } },
      });
    }

    return tx.booking.findUnique({
      where: { id: nextBooking.id },
      include: bookingInclude,
    });
  });

  return serializeBooking(updated, { includeCustomerContact: true });
};

module.exports = {
  hireQuote,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getTradesmanJobs,
  updateAssignedJobStatus,
};
