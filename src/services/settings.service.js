const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const CONTACT_KEY = "contact";

const DEFAULT_CONTACT = {
  address: "2 enterprise house, barkering, London IG11 0JZ, United Kingdom",
  phone: "07392255366",
  email: "admin@tradersinloop.co.uk",
};

const serializeContact = (row) => ({
  address: row.address,
  phone: row.phone,
  email: row.email,
  updatedAt: row.updatedAt,
});

const getContact = async () => {
  const existing = await prisma.siteSetting.findUnique({
    where: { key: CONTACT_KEY },
  });

  if (existing) {
    return serializeContact(existing);
  }

  const created = await prisma.siteSetting.create({
    data: {
      key: CONTACT_KEY,
      ...DEFAULT_CONTACT,
    },
  });

  return serializeContact(created);
};

const updateContact = async (payload) => {
  const address = payload.address?.trim();
  const phone = payload.phone?.trim();
  const email = payload.email?.trim();

  if (!address || !phone || !email) {
    throw new ApiError(400, "address, phone, and email are required");
  }

  const updated = await prisma.siteSetting.upsert({
    where: { key: CONTACT_KEY },
    update: { address, phone, email },
    create: {
      key: CONTACT_KEY,
      address,
      phone,
      email,
    },
  });

  return serializeContact(updated);
};

module.exports = { getContact, updateContact };
