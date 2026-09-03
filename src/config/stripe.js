const Stripe = require("stripe");
const env = require("./env");
const ApiError = require("../utils/apiError");

const getStripe = () => {
  if (!env.stripeSecretKey) {
    throw new ApiError(500, "Stripe is not configured");
  }
  return new Stripe(env.stripeSecretKey);
};

module.exports = { getStripe };
