const express = require("express");
const tokenRuleController = require("../controllers/tokenRule.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authenticate, tokenRuleController.listActiveRules);

module.exports = router;
