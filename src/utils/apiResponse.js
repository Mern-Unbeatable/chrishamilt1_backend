const success = (res, { statusCode = 200, message = "Success", data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const paginated = (
  res,
  {
    statusCode = 200,
    message = "Success",
    data = [],
    page = 1,
    limit = 10,
    total = 0,
  } = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
};

module.exports = { success, paginated };
