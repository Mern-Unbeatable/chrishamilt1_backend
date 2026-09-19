const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyOtpValidator,
  resetPasswordValidator,
} = require("../middlewares/validators/auth.validator");

const router = express.Router();

router.post("/register", registerValidator, validate, authController.register);
router.post("/login", loginValidator, validate, authController.login);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);
router.post(
  "/verify-otp",
  verifyOtpValidator,
  validate,
  authController.verifyOtp
);
router.post(
  "/reset-password",
  resetPasswordValidator,
  validate,
  authController.resetPassword
);
router.get("/me", authenticate, authController.me);

module.exports = router;
