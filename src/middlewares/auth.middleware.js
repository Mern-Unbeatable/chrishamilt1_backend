const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/apiError");
const prisma = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tradesmanProfile: true },
    });

    if (!user) {
      throw new ApiError(401, "Account not found");
    }

    if (user.status === "SUSPENDED") {
      throw new ApiError(403, "Account is suspended");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tradesmanProfile: true },
    });
    req.user = user && user.status === "ACTIVE" ? user : null;
  } catch {
    req.user = null;
  }

  next();
};

module.exports = { authenticate, optionalAuth };
