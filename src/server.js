const env = require("./config/env");
const app = require("./app");
const prisma = require("./config/prisma");

const server = app.listen(env.port, () => {
  console.log(`Traders In Loop API listening on port ${env.port} (${env.nodeEnv})`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = server;
