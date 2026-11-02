const splitFullName = (fullName) => {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName };
};

const env = require("../config/env");

const isPrimaryAdmin = (user) => {
  if (!user || user.role !== "ADMIN") return false;
  return String(user.email || "").trim().toLowerCase() === env.primaryAdminEmail;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, passwordResetToken, passwordResetExpires, ...safe } = user;
  return {
    ...safe,
    isPrimaryAdmin: isPrimaryAdmin(user),
  };
};

const toNumber = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

module.exports = { splitFullName, sanitizeUser, toNumber, isPrimaryAdmin };
