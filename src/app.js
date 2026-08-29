const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

const welcome = (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the chrishamilt1 backend Project",
  });
};

app.get("/", welcome);
app.get("/api", welcome);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Traders In Loop API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
