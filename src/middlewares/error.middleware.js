const env = require("../config/env");

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.code === "P2002") {
    statusCode = 409;
    const fields = err.meta?.target || [];
    message = `A record with this ${fields.join(", ") || "value"} already exists`;
  }

  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }

  const payload = {
    success: false,
    message,
  };

  if (err.errors) {
    payload.errors = err.errors;
  }

  if (env.nodeEnv === "development" && statusCode === 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = { notFound, errorHandler };
