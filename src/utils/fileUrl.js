const env = require("../config/env");

const parseList = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseList(item) || []).filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through to split
    }
  }

  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const publicFileUrl = (filename, req) => {
  const configured = env.publicBaseUrl ? env.publicBaseUrl.replace(/\/$/, "") : "";
  const origin =
    configured || `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
  return `${origin}/uploads/${filename}`;
};

module.exports = { parseList, publicFileUrl };
