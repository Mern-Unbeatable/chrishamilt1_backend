const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  updateProfileValidator,
  changePasswordValidator,
} = require("../middlewares/validators/auth.validator");

const router = express.Router();

router.use(authenticate);

router.get("/profile", userController.getProfile);
router.put("/profile", updateProfileValidator, validate, userController.updateProfile);
router.put(
  "/change-password",
  changePasswordValidator,
  validate,
  userController.changePassword
);

module.exports = router;
