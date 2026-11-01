const { body } = require("express-validator");

const updateContactValidator = [
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("phone").trim().notEmpty().withMessage("Phone is required"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
];

module.exports = { updateContactValidator };
