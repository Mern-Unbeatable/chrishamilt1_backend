const { body } = require("express-validator");

const registerValidator = [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("phoneNumber").trim().notEmpty().withMessage("Phone number is required"),
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("role")
    .optional()
    .isIn(["USER", "TRADESMAN", "ADMIN"])
    .withMessage("Role must be USER, TRADESMAN, or ADMIN"),
];

const loginValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  body("rememberMe").optional().isBoolean().withMessage("rememberMe must be a boolean"),
];

const forgotPasswordValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
];

const verifyOtpValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("otp")
    .trim()
    .matches(/^\d{5}$/)
    .withMessage("OTP must be a 5-digit code"),
];

const resetPasswordValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];

const changePasswordValidator = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];

const updateProfileValidator = [
  body("fullName").optional().trim().notEmpty().withMessage("Full name cannot be empty"),
  body("firstName").optional().trim(),
  body("lastName").optional().trim(),
  body("phoneNumber").optional().trim().notEmpty().withMessage("Phone number cannot be empty"),
  body("address").optional().trim().notEmpty().withMessage("Address cannot be empty"),
  body("region").optional().trim(),
  body("city").optional().trim(),
  body("zipCode").optional().trim(),
  body("profileImage").optional().isString(),
  body("email").optional().isEmail().withMessage("A valid email is required").normalizeEmail(),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyOtpValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
};
