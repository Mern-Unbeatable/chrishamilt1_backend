const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");
const { serializeProfile } = require("../utils/serialize");

const reviewInclude = {
  reviewer: {
    select: { id: true, fullName: true, firstName: true, profileImage: true },
  },
  job: {
    select: { id: true, title: true, jobCode: true, category: true },
  },
};

const serializeReview = (review) => ({
  id: review.id,
  jobId: review.jobId,
  reviewerId: review.reviewerId,
  tradesmanId: review.tradesmanId,
  rating: review.rating,
  comment: review.comment,
  reply: review.reply,
  repliedAt: review.repliedAt,
  createdAt: review.createdAt,
  reviewer: review.reviewer,
  job: review.job,
});

const refreshTradesmanRating = async (tx, tradesmanId) => {
  const stats = await tx.review.aggregate({
    where: { tradesmanId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.tradesmanProfile.updateMany({
    where: { userId: tradesmanId },
    data: {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count._all,
    },
  });
};

const createReview = async (reviewerId, { jobId, rating, comment }) => {
  const booking = await prisma.booking.findUnique({
    where: { jobId },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found for this job");
  }
  if (booking.customerId !== reviewerId) {
    throw new ApiError(403, "You can only review jobs you booked");
  }
  if (booking.status !== "COMPLETED") {
    throw new ApiError(400, "You can only review a completed job");
  }

  const existing = await prisma.review.findUnique({
    where: { jobId_reviewerId: { jobId, reviewerId } },
  });
  if (existing) {
    throw new ApiError(409, "You have already reviewed this job");
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        jobId,
        reviewerId,
        tradesmanId: booking.tradesmanId,
        rating,
        comment,
      },
      include: reviewInclude,
    });

    await refreshTradesmanRating(tx, booking.tradesmanId);
    return created;
  });

  return serializeReview(review);
};

const replyToReview = async (reviewId, tradesmanId, reply) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new ApiError(404, "Review not found");
  }
  if (review.tradesmanId !== tradesmanId) {
    throw new ApiError(403, "You can only reply to your own reviews");
  }
  if (review.reply) {
    throw new ApiError(400, "You have already replied to this review");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { reply, repliedAt: new Date() },
    include: reviewInclude,
  });

  return serializeReview(updated);
};

const listTradesmanReviews = async (tradesmanId, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const tradesman = await prisma.user.findUnique({
    where: { id: tradesmanId },
    include: { tradesmanProfile: true },
  });

  if (!tradesman || tradesman.role !== "TRADESMAN") {
    throw new ApiError(404, "Tradesman not found");
  }

  const [reviews, total, grouped] = await Promise.all([
    prisma.review.findMany({
      where: { tradesmanId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where: { tradesmanId } }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { tradesmanId },
      _count: { rating: true },
    }),
  ]);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  grouped.forEach((row) => {
    distribution[row.rating] = row._count.rating;
  });

  return {
    summary: {
      averageRating: toNumber(tradesman.tradesmanProfile?.averageRating) || 0,
      totalReviews: tradesman.tradesmanProfile?.totalReviews || total,
      distribution,
      profile: serializeProfile(tradesman.tradesmanProfile),
    },
    reviews: reviews.map(serializeReview),
    total,
    page,
    limit,
  };
};

module.exports = { createReview, replyToReview, listTradesmanReviews };
