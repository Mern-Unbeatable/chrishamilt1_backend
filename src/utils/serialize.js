const { toNumber, sanitizeUser } = require("./user");

const serializeProfile = (profile) => {
  if (!profile) return null;
  return {
    ...profile,
    publicLiabilityCover: toNumber(profile.publicLiabilityCover),
    averageRating: toNumber(profile.averageRating),
  };
};

const serializeTradesman = (user) => {
  if (!user) return null;
  const safe = sanitizeUser(user);
  return {
    id: safe.id,
    fullName: safe.fullName,
    firstName: safe.firstName,
    lastName: safe.lastName,
    profileImage: safe.profileImage,
    city: safe.city,
    address: safe.address,
    phoneNumber: safe.phoneNumber,
    email: safe.email,
    tokenBalance: safe.tokenBalance,
    tradesmanProfile: serializeProfile(safe.tradesmanProfile),
  };
};

const serializeCustomer = (user, { includeContact = false } = {}) => {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    firstName: user.firstName,
    profileImage: user.profileImage,
    ...(includeContact
      ? {
          email: user.email,
          phoneNumber: user.phoneNumber,
        }
      : {}),
  };
};

module.exports = { serializeProfile, serializeTradesman, serializeCustomer };
