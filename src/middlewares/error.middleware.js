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

  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Each image must be 5MB or smaller";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "You can upload a maximum of 10 images";
    } else {
      message = err.message;
    }
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
