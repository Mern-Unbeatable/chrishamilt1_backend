const { parseList, publicFileUrl } = require("../utils/fileUrl");

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return value;
};

const attachUploadedImages = (req) => {
  const uploaded = Array.isArray(req.files)
    ? req.files.map((file) => publicFileUrl(file.filename, req))
    : [];

  if (req.body.images !== undefined) {
    req.body.images = [...(parseList(req.body.images) || []), ...uploaded];
  } else if (uploaded.length) {
    req.body.images = uploaded;
  }
};

const parseJobForm = (req, res, next) => {
  if (req.body.requirements !== undefined) {
    req.body.requirements = parseList(req.body.requirements);
  }
  attachUploadedImages(req);
  next();
};

const parseQuoteForm = (req, res, next) => {
  if (req.body.materialsIncluded !== undefined) {
    req.body.materialsIncluded = parseBoolean(req.body.materialsIncluded);
  }
  attachUploadedImages(req);
  next();
};

module.exports = { parseJobForm, parseQuoteForm };
