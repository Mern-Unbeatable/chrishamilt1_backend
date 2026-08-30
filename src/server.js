const http = require("http");
const { Server } = require("socket.io");
const env = require("./config/env");
const app = require("./app");
const prisma = require("./config/prisma");
const { initSockets } = require("./sockets");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    credentials: true,
  },
});

initSockets(io);

server.listen(env.port, () => {
  console.log(`Traders In Loop API listening on port ${env.port} (${env.nodeEnv})`);
});

const shutdown = async () => {
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = server;
