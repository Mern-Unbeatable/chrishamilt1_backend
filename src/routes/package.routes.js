const express = require("express");
const packageController = require("../controllers/package.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  packageIdValidator,
  confirmCheckoutValidator,
} = require("../middlewares/validators/package.validator");

const router = express.Router();

router.get("/", packageController.listPublicPackages);
router.get("/stripe/success", packageController.stripeSuccess);

router.post(
  "/confirm",
  authenticate,
  authorize("TRADESMAN"),
  confirmCheckoutValidator,
  validate,
  packageController.confirmCheckout
);

router.post(
  "/:id/checkout",
  authenticate,
  authorize("TRADESMAN"),
  packageIdValidator,
  validate,
  packageController.startCheckout
);

module.exports = router;
