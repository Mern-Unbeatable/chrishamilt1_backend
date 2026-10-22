const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const tokenRuleService = require("../services/tokenRule.service");

const listRules = asyncHandler(async (req, res) => {
  const rules = await tokenRuleService.listRules();
  return res.status(200).json({
    success: true,
    message: "Token rules fetched",
    total: rules.length,
    data: rules,
  });
});

const listActiveRules = asyncHandler(async (req, res) => {
  const rules = await tokenRuleService.listActiveRules();
  return res.status(200).json({
    success: true,
    message: "Token rules fetched",
    total: rules.length,
    data: rules,
  });
});

const createRule = asyncHandler(async (req, res) => {
  const rule = await tokenRuleService.createRule(req.body);
  return success(res, { statusCode: 201, message: "Token rule created", data: rule });
});

const updateRule = asyncHandler(async (req, res) => {
  const rule = await tokenRuleService.updateRule(req.params.id, req.body);
  return success(res, { message: "Token rule updated", data: rule });
});

const deleteRule = asyncHandler(async (req, res) => {
  const result = await tokenRuleService.deleteRule(req.params.id);
  return success(res, { message: "Token rule deleted", data: result });
});

module.exports = { listRules, listActiveRules, createRule, updateRule, deleteRule };
