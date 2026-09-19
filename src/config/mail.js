const nodemailer = require("nodemailer");
const env = require("./env");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!env.smtpUser || !env.smtpPass) return null;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465 || env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
};

module.exports = { getTransporter };
