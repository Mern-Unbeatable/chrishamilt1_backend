const jwt = require("jsonwebtoken");
const env = require("../config/env");

const signToken = (payload, { rememberMe = false } = {}) => {
  const expiresIn = rememberMe ? env.jwtRememberExpiresIn : env.jwtExpiresIn;
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

module.exports = { signToken, verifyToken };
