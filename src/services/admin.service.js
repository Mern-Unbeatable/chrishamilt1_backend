const prisma = require("../config/prisma");
const { toNumber } = require("../utils/user");

const LOW_TOKEN_THRESHOLD = 20;
const TOP_BUYERS_LIMIT = 7;

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
    keys.push(monthKey(new Date(cursor.getFullYear(), cursor.getMonth() - i, 1)));
  }

  return keys;
};

const startOfDay = (date = new Date()) => {
  const point = new Date(date);
  point.setHours(0, 0, 0, 0);
  return point;
};

const startOfMonth = (date = new Date()) => {
  const point = startOfDay(date);
  point.setDate(1);
  return point;
};

const money = (value) => Math.round((toNumber(value) || 0) * 100) / 100;

const emptyMonthMap = (months) => Object.fromEntries(months.map((key) => [key, 0]));

const getDashboard = async () => {
  const todayStart = startOfDay();
  const monthStart = startOfMonth();
  const chartFrom = new Date(monthStart.getFullYear(), monthStart.getMonth() - 11, 1);
  const months = lastTwelveMonthKeys();

  const [
    totalCustomers,
    totalTradesmen,
    activeTradesmen,
    lowTokenAccounts,
    jobsPosted,
    openJobs,
    completedJobs,
    quotesToday,
    tokenSalesToday,
    monthlyRevenue,
    totalTokensSold,
    tokensUsed,
    purchaseRows,
    completedJobRows,
    newUsers,
    topBuyerGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "TRADESMAN" } }),
    prisma.user.count({ where: { role: "TRADESMAN", status: "ACTIVE" } }),
    prisma.user.count({
      where: {
        role: "TRADESMAN",
        tokenBalance: { lt: LOW_TOKEN_THRESHOLD },
      },
    }),
    prisma.job.count(),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.quote.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.tokenPurchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    prisma.tokenPurchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.tokenPurchase.aggregate({
      where: { status: "COMPLETED" },
      _sum: { tokens: true },
    }),
    prisma.tokenUsage.aggregate({
      _sum: { tokens: true },
    }),
    prisma.tokenPurchase.findMany({
      where: { status: "COMPLETED", createdAt: { gte: chartFrom } },
      select: { amount: true, createdAt: true },
    }),
    prisma.job.findMany({
      where: { status: "COMPLETED", updatedAt: { gte: chartFrom } },
      select: { updatedAt: true },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["USER", "TRADESMAN"] },
        createdAt: { gte: chartFrom },
      },
      select: { role: true, createdAt: true },
    }),
    prisma.tokenPurchase.groupBy({
      by: ["tradesmanId"],
      where: { status: "COMPLETED" },
      _sum: { amount: true, tokens: true },
      orderBy: { _sum: { amount: "desc" } },
      take: TOP_BUYERS_LIMIT,
    }),
  ]);

  const earningsByMonth = emptyMonthMap(months);
  purchaseRows.forEach((row) => {
    const key = monthKey(row.createdAt);
    if (key in earningsByMonth) {
      earningsByMonth[key] += money(row.amount);
    }
  });

  const jobsByMonth = emptyMonthMap(months);
  completedJobRows.forEach((row) => {
    const key = monthKey(row.updatedAt);
    if (key in jobsByMonth) {
      jobsByMonth[key] += 1;
    }
  });

  const customersByMonth = emptyMonthMap(months);
  const tradesmenByMonth = emptyMonthMap(months);
  newUsers.forEach((row) => {
    const key = monthKey(row.createdAt);
    if (row.role === "USER" && key in customersByMonth) {
      customersByMonth[key] += 1;
    }
    if (row.role === "TRADESMAN" && key in tradesmenByMonth) {
      tradesmenByMonth[key] += 1;
    }
  });

  let customerTotal = 0;
  let tradesmanTotal = 0;
  const growth = months.map((key) => {
    customerTotal += customersByMonth[key];
    tradesmanTotal += tradesmenByMonth[key];
    const monthIndex = Number(key.slice(5, 7)) - 1;
    return {
      month: key,
      label: MONTH_LABELS[monthIndex],
      newCustomers: customersByMonth[key],
      newTradesmen: tradesmenByMonth[key],
      customers: customerTotal,
      tradesmen: tradesmanTotal,
    };
  });

  const buyerIds = topBuyerGroups.map((row) => row.tradesmanId);
  const buyers = buyerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: buyerIds } },
        include: { tradesmanProfile: true },
      })
    : [];
  const buyerMap = Object.fromEntries(buyers.map((user) => [user.id, user]));

  const topTokenBuyers = topBuyerGroups.map((row, index) => {
    const user = buyerMap[row.tradesmanId];
    return {
      rank: index + 1,
      tradesmanId: row.tradesmanId,
      name: user?.tradesmanProfile?.businessName || user?.fullName || "Unknown",
      amount: money(row._sum.amount),
      tokens: row._sum.tokens || 0,
    };
  });

  const chartPoint = (map, key) => {
    const monthIndex = Number(key.slice(5, 7)) - 1;
    return {
      month: key,
      label: MONTH_LABELS[monthIndex],
      amount: money(map[key]),
    };
  };

  return {
    cards: {
      totalCustomers,
      totalTradesmen,
      activeTradesmen,
      lowTokenAccounts,
      lowTokenThreshold: LOW_TOKEN_THRESHOLD,
      jobsPosted,
      openJobs,
      completedJobs,
      quotesToday,
      tokenSalesToday: money(tokenSalesToday._sum.amount),
      monthlyRevenue: money(monthlyRevenue._sum.amount),
      totalTokensSold: totalTokensSold._sum.tokens || 0,
      tokensUsed: tokensUsed._sum.tokens || 0,
    },
    charts: {
      monthlyEarnings: months.map((key) => chartPoint(earningsByMonth, key)),
      jobsCompleted: months.map((key) => {
        const monthIndex = Number(key.slice(5, 7)) - 1;
        return {
          month: key,
          label: MONTH_LABELS[monthIndex],
          count: jobsByMonth[key],
        };
      }),
      growth,
    },
    topTokenBuyers,
  };
};

module.exports = { getDashboard };
