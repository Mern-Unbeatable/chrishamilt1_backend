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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const startOfDay = (date = new Date()) => {
  const point = new Date(date);
  point.setHours(0, 0, 0, 0);
  return point;
};

const startOfWeek = (date = new Date()) => {
  const point = startOfDay(date);
  const day = point.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  point.setDate(point.getDate() - daysFromMonday);
  return point;
};

const startOfMonth = (date = new Date()) => {
  const point = startOfDay(date);
  point.setDate(1);
  return point;
};

const addDays = (date, days) => {
  const point = new Date(date);
  point.setDate(point.getDate() + days);
  return point;
};

const addMonths = (date, months) => {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
};

const money = (value) => Math.round((toNumber(value) || 0) * 100) / 100;

const percentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const sumEarnings = async (tradesmanId, from, to) => {
  const result = await prisma.earning.aggregate({
    where: {
      tradesmanId,
      createdAt: {
        gte: from,
        ...(to ? { lt: to } : {}),
      },
    },
    _sum: { amount: true },
  });
  return money(result._sum.amount);
};

const getEarnings = async (tradesmanId, query = {}) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const lastWeekStart = addDays(weekStart, -7);
  const monthStart = startOfMonth(now);
  const lastMonthStart = addMonths(monthStart, -1);
  const chartFrom = addMonths(monthStart, -11);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [
    today,
    thisWeek,
    lastWeek,
    thisMonth,
    lastMonth,
    lifetimeResult,
    completedJobs,
    chartRows,
    recentRows,
    recentTotal,
  ] = await Promise.all([
    sumEarnings(tradesmanId, todayStart),
    sumEarnings(tradesmanId, weekStart),
    sumEarnings(tradesmanId, lastWeekStart, weekStart),
    sumEarnings(tradesmanId, monthStart),
    sumEarnings(tradesmanId, lastMonthStart, monthStart),
    prisma.earning.aggregate({
      where: { tradesmanId },
      _sum: { amount: true },
    }),
    prisma.booking.count({ where: { tradesmanId, status: "COMPLETED" } }),
    prisma.earning.findMany({
      where: { tradesmanId, createdAt: { gte: chartFrom } },
      select: { amount: true, createdAt: true },
    }),
    prisma.earning.findMany({
      where: { tradesmanId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        job: { select: { id: true, jobCode: true, title: true } },
      },
    }),
    prisma.earning.count({ where: { tradesmanId } }),
  ]);

  const lifetime = money(lifetimeResult._sum.amount);
  const averageJobValue = completedJobs ? money(lifetime / completedJobs) : 0;

  const months = lastTwelveMonthKeys();
  const earningsByMonth = Object.fromEntries(months.map((key) => [key, 0]));
  chartRows.forEach((row) => {
    const key = monthKey(row.createdAt);
    if (key in earningsByMonth) {
      earningsByMonth[key] += money(row.amount);
    }
  });

  return {
    summary: {
      today,
      thisWeek,
      thisWeekChangePercent: percentChange(thisWeek, lastWeek),
      thisMonth,
      thisMonthChangePercent: percentChange(thisMonth, lastMonth),
      lifetime,
    },
    revenue: {
      averageJobValue,
      completedJobs,
    },
    payoutNote: "Payouts land 2 working days after customer approval.",
    charts: {
      monthlyRevenue: months.map((key) => {
        const monthIndex = Number(key.slice(5, 7)) - 1;
        return {
          month: key,
          label: MONTH_LABELS[monthIndex],
          amount: money(earningsByMonth[key]),
        };
      }),
    },
    recent: {
      items: recentRows.map((row) => ({
        id: row.id,
        jobId: row.jobId,
        jobCode: row.job?.jobCode || null,
        jobTitle: row.job?.title || null,
        amount: money(row.amount),
        createdAt: row.createdAt,
      })),
      total: recentTotal,
      page,
      limit,
    },
  };
};

const getWallet = async (tradesmanId) => {
  const [user, used, purchased, cheapestRule] = await Promise.all([
    prisma.user.findUnique({
      where: { id: tradesmanId },
      select: { tokenBalance: true },
    }),
    prisma.tokenUsage.aggregate({
      where: { tradesmanId },
      _sum: { tokens: true },
    }),
    prisma.tokenPurchase.aggregate({
      where: { tradesmanId, status: "COMPLETED" },
      _sum: { tokens: true },
    }),
    prisma.tokenRule.findFirst({
      where: { isActive: true },
      orderBy: { tokenCost: "asc" },
      select: { tokenCost: true },
    }),
  ]);

  const availableTokens = user?.tokenBalance || 0;
  const tokensUsed = used._sum.tokens || 0;
  const tokensPurchased = purchased._sum.tokens || 0;
  const quoteTokenCost = cheapestRule?.tokenCost || 14;

  return {
    availableTokens,
    tokensUsed,
    tokensPurchased,
    quotesRemaining: quoteTokenCost > 0 ? Math.floor(availableTokens / quoteTokenCost) : 0,
    quoteTokenCost,
  };
};

module.exports = { getDashboard, getEarnings, getWallet };
