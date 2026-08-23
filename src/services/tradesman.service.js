const prisma = require("../config/prisma");
const { toNumber } = require("../utils/user");
const { serializeProfile } = require("../utils/serialize");

const monthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const lastTwelveMonthKeys = () => {
  const keys = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 11; i >= 0; i -= 1) {
    const point = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    keys.push(monthKey(point));
  }

  return keys;
};

const getDashboard = async (tradesmanId) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const chartFrom = new Date();
  chartFrom.setMonth(chartFrom.getMonth() - 11);
  chartFrom.setDate(1);
  chartFrom.setHours(0, 0, 0, 0);

  const [
    user,
    pendingQuotes,
    acceptedQuotes,
    activeJobs,
    completedJobs,
    totalEarnings,
    monthlyEarnings,
    unreadMessages,
    earningRows,
    completedJobRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: tradesmanId },
      include: { tradesmanProfile: true },
    }),
    prisma.quote.count({ where: { tradesmanId, status: "SUBMITTED" } }),
    prisma.quote.count({ where: { tradesmanId, status: "ACCEPTED" } }),
    prisma.booking.count({
      where: { tradesmanId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
    }),
    prisma.booking.count({ where: { tradesmanId, status: "COMPLETED" } }),
    prisma.earning.aggregate({
      where: { tradesmanId },
      _sum: { amount: true },
    }),
    prisma.earning.aggregate({
      where: { tradesmanId, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.message.count({
      where: {
        isRead: false,
        conversation: { tradesmanId },
        senderId: { not: tradesmanId },
      },
    }),
    prisma.earning.findMany({
      where: { tradesmanId, createdAt: { gte: chartFrom } },
      select: { amount: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { tradesmanId, status: "COMPLETED", updatedAt: { gte: chartFrom } },
      select: { updatedAt: true },
    }),
  ]);

  const months = lastTwelveMonthKeys();
  const earningsByMonth = Object.fromEntries(months.map((key) => [key, 0]));
  const jobsByMonth = Object.fromEntries(months.map((key) => [key, 0]));

  earningRows.forEach((row) => {
    const key = monthKey(row.createdAt);
    if (key in earningsByMonth) {
      earningsByMonth[key] += toNumber(row.amount) || 0;
    }
  });

  completedJobRows.forEach((row) => {
    const key = monthKey(row.updatedAt);
    if (key in jobsByMonth) {
      jobsByMonth[key] += 1;
    }
  });

  return {
    tokens: user?.tokenBalance || 0,
    pendingQuotes,
    acceptedQuotes,
    activeJobs,
    completedJobs,
    monthlyEarnings: toNumber(monthlyEarnings._sum.amount) || 0,
    totalEarnings: toNumber(totalEarnings._sum.amount) || 0,
    averageRating: toNumber(user?.tradesmanProfile?.averageRating) || 0,
    unreadMessages,
    profile: serializeProfile(user?.tradesmanProfile),
    charts: {
      monthlyEarnings: months.map((month) => ({ month, amount: earningsByMonth[month] })),
      jobsCompleted: months.map((month) => ({ month, count: jobsByMonth[month] })),
    },
  };
};

module.exports = { getDashboard };
