const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { splitFullName, sanitizeUser } = require("../utils/user");

const register = async ({ fullName, email, phoneNumber, address, password, role = "USER" }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const { firstName, lastName } = splitFullName(fullName);
  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      fullName,
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      password: hashed,
      role,
      tokenBalance: 0,
      ...(role === "TRADESMAN"
        ? {
            tradesmanProfile: {
              create: {
                businessName: fullName,
                location: address,
              },
            },
          }
        : {}),
    },
    include: { tradesmanProfile: true },
  });

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
};

const login = async ({ email, password, rememberMe = false }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tradesmanProfile: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await comparePassword(password, user.password);
  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.status === "SUSPENDED") {
    throw new ApiError(403, "Account is suspended");
  }

  const token = signToken({ id: user.id, role: user.role }, { rememberMe });
  return { user: sanitizeUser(user), token };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tradesmanProfile: true, warehouses: true },
  });

  if (!user) {
    throw new ApiError(404, "Account not found");
  }

  return sanitizeUser(user);
};

module.exports = { register, login, getMe };
