const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");
const settingsService = require("../services/settings.service");

const getContact = asyncHandler(async (req, res) => {
  const contact = await settingsService.getContact();
  return success(res, { message: "Contact settings fetched", data: contact });
});

const updateContact = asyncHandler(async (req, res) => {
  const contact = await settingsService.updateContact(req.body);
  return success(res, { message: "Contact settings updated", data: contact });
});

module.exports = { getContact, updateContact };
