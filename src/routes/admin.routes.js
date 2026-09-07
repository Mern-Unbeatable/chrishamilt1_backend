const express = require("express");
const { body, param } = require("express-validator");
const userController = require("../controllers/user.controller");
const adminController = require("../controllers/admin.controller");
const packageController = require("../controllers/package.controller");
const tokenRuleController = require("../controllers/tokenRule.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const { validate } = require("../middlewares/validate.middleware");
const {
  createPackageValidator,
  updatePackageValidator,
  packageIdValidator,
  listPurchasesValidator,
} = require("../middlewares/validators/package.validator");
const {
  createRuleValidator,
  updateRuleValidator,
  ruleIdValidator,
} = require("../middlewares/validators/tokenRule.validator");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", adminController.getDashboard);
router.get("/customers", userController.listCustomers);
router.get(
  "/customers/:id",
  param("id").isUUID().withMessage("Invalid user id"),
  validate,
  userController.getCustomer
);
router.get("/tradesmen", userController.listTradesmen);
router.get(
  "/tradesmen/:id",
  param("id").isUUID().withMessage("Invalid user id"),
  validate,
  userController.getTradesman
);
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

router.get("/packages", packageController.listAdminPackages);
router.post(
  "/packages",
  createPackageValidator,
  validate,
  packageController.createPackage
);
router.put(
  "/packages/:id",
  updatePackageValidator,
  validate,
  packageController.updatePackage
);
router.delete(
  "/packages/:id",
  packageIdValidator,
  validate,
  packageController.deletePackage
);

router.get(
  "/purchases",
  listPurchasesValidator,
  validate,
  packageController.listAdminPurchases
);

router.get("/token-rules", tokenRuleController.listRules);
router.post(
  "/token-rules",
  createRuleValidator,
  validate,
  tokenRuleController.createRule
);
router.put(
  "/token-rules/:id",
  updateRuleValidator,
  validate,
  tokenRuleController.updateRule
);
router.delete(
  "/token-rules/:id",
  ruleIdValidator,
  validate,
  tokenRuleController.deleteRule
);

module.exports = router;
