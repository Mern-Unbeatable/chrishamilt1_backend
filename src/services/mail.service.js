const env = require("../config/env");
const { getTransporter } = require("../config/mail");
const ApiError = require("../utils/apiError");

const sendMail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  if (!transporter) {
    throw new ApiError(500, "Email is not configured");
  }

  return transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  });
};

const sendPasswordResetOtp = async ({ to, fullName, otp }) => {
  const name = fullName || "there";

  return sendMail({
    to,
    subject: "Your Traders In Loop password reset code",
    text: `Hi ${name}, your password reset code is ${otp}. It expires in 10 minutes.`,
    html: `
      <p>Hi ${name},</p>
      <p>Your Traders In Loop password reset code is:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    `,
  });
};

module.exports = { sendMail, sendPasswordResetOtp };
