const splitFullName = (fullName) => {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName };
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, passwordResetToken, passwordResetExpires, ...safe } = user;
  return safe;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

module.exports = { splitFullName, sanitizeUser, toNumber };
