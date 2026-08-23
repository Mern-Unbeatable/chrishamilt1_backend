const express = require("express");
const { body, param } = require("express-validator");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/customers", userController.listCustomers);
router.get("/tradesmen", userController.listTradesmen);
router.patch(
  "/users/:id/status",
  param("id").isUUID().withMessage("Invalid user id"),
  body("status")
    .isIn(["ACTIVE", "SUSPENDED"])
    .withMessage("Status must be ACTIVE or SUSPENDED"),
  validate,
  userController.setAccountStatus
);

router.patch(
  "/tradesmen/:id/tokens",
  param("id").isUUID().withMessage("Invalid user id"),
  body("amount").isFloat({ min: 1 }).withMessage("amount must be a positive number"),
  validate,
  userController.grantTokens
);

module.exports = router;
