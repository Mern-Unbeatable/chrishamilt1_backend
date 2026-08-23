const ApiError = require("../utils/apiError");

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }

    next();
  };

module.exports = { authorize };
