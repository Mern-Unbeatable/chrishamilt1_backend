const bcrypt = require("bcryptjs");
const env = require("../config/env");

const hashPassword = async (plain) => {
  return bcrypt.hash(plain, env.bcryptSaltRounds);
};

const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = { hashPassword, comparePassword };
