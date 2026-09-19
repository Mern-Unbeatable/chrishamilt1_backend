const dotenv = require("dotenv");

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "40d",
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || "40d",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL || "https://api.tradersinloop.co.uk",
  frontendUrl: process.env.FRONTEND_URL || "https://tradersinloop.co.uk",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeSuccessUrl:
    process.env.STRIPE_SUCCESS_URL ||
    "https://tradersinloop.co.uk/wallet?status=success",
  stripeCancelUrl:
    process.env.STRIPE_CANCEL_URL ||
    "https://tradersinloop.co.uk/wallet?status=cancelled",
  smtpHost: process.env.SMTP_HOST || "smtp.hostinger.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure: process.env.SMTP_SECURE !== "false",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom:
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "Traders In Loop <admin@tradersinloop.co.uk>",
};
