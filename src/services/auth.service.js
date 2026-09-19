const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { splitFullName, sanitizeUser } = require("../utils/user");
const { sendPasswordResetOtp } = require("./mail.service");

const RESET_OTP_MINUTES = 10;

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const verifiedResetKey = (userId) => hashOtp(`verified:${userId}`);

const createOtp = () => String(crypto.randomInt(10000, 100000));

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

// login user by email and password
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

const forgotPassword = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const message = "If that email is registered, a reset code has been sent";

  if (!user || user.status === "SUSPENDED") {
    return { message };
  }

  const otp = createOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashOtp(otp),
      passwordResetExpires: new Date(Date.now() + RESET_OTP_MINUTES * 60 * 1000),
    },
  });

  await sendPasswordResetOtp({
    to: user.email,
    fullName: user.fullName,
    otp,
  });

  return { message };
};

const verifyOtp = async ({ email, otp }) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
      passwordResetToken: hashOtp(otp),
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, "OTP is invalid or has expired");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: verifiedResetKey(user.id),
    },
  });

  return { message: "OTP verified", email: user.email };
};

const resetPassword = async ({ email, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const verified =
    user &&
    user.passwordResetToken === verifiedResetKey(user.id) &&
    user.passwordResetExpires &&
    user.passwordResetExpires > new Date();

  if (!verified) {
    throw new ApiError(400, "Verify the OTP before resetting the password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return { message: "Password reset successfully" };
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

module.exports = { register, login, forgotPassword, verifyOtp, resetPassword, getMe };
