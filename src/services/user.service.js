const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { hashPassword, comparePassword } = require("../utils/password");
const { splitFullName, sanitizeUser } = require("../utils/user");

const updateProfile = async (userId, payload) => {
  const data = { ...payload };

  if (data.email) {
    const taken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (taken) {
      throw new ApiError(409, "An account with this email already exists");
    }
  }

  if (data.fullName && !data.firstName && !data.lastName) {
    Object.assign(data, splitFullName(data.fullName));
  }

  if ((data.firstName || data.lastName) && !data.fullName) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    const firstName = data.firstName ?? current.firstName ?? "";
    const lastName = data.lastName ?? current.lastName ?? "";
    data.fullName = `${firstName} ${lastName}`.trim();
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { tradesmanProfile: true, warehouses: true },
  });

  return sanitizeUser(user);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const matches = await comparePassword(currentPassword, user.password);

  if (!matches) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
};

const listUsers = async ({ role, status, page = 1, limit = 10, search }) => {
  const skip = (page - 1) * limit;
  const where = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        tradesmanProfile: true,
        _count: { select: { postedJobs: true, assignedJobs: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(sanitizeUser),
    total,
    page,
    limit,
  };
};

const setAccountStatus = async (userId, status) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
    include: { tradesmanProfile: true },
  });

  return sanitizeUser(updated);
};

const grantTokens = async (userId, amount) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.role !== "TRADESMAN") {
    throw new ApiError(400, "Tokens can only be granted to tradesmen");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Token amount must be a positive number");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: Math.round(amount) } },
    include: { tradesmanProfile: true },
  });

  return sanitizeUser(updated);
};

module.exports = {
  updateProfile,
  changePassword,
  listUsers,
  setAccountStatus,
  grantTokens,
};
