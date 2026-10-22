const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const jobRoutes = require("./job.routes");
const categoryRoutes = require("./category.routes");
const adminRoutes = require("./admin.routes");
const quoteRoutes = require("./quote.routes");
const bookingRoutes = require("./booking.routes");
const reviewRoutes = require("./review.routes");
const tradesmanRoutes = require("./tradesman.routes");
const conversationRoutes = require("./conversation.routes");
const packageRoutes = require("./package.routes");
const tokenRuleRoutes = require("./tokenRule.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/jobs", jobRoutes);
router.use("/categories", categoryRoutes);
router.use("/packages", packageRoutes);
router.use("/token-rules", tokenRuleRoutes);
router.use("/quotes", quoteRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/tradesman", tradesmanRoutes);
router.use("/conversations", conversationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
