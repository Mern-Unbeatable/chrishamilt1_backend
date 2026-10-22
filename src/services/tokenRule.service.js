const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toNumber } = require("../utils/user");

const money = (value) => toNumber(value) ?? null;

const formatGbp = (value) =>
  `£${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const formatBudgetRange = (minBudget, maxBudget) => {
  const min = money(minBudget) || 0;
  const max = money(maxBudget);
  if (max === null || max === undefined) {
    return min <= 0 ? "Any budget" : `${formatGbp(min)}+`;
  }
  if (min <= 0) {
    return `Under ${formatGbp(max)}`;
  }
  return `${formatGbp(min)} – ${formatGbp(max)}`;
};

const serializeRule = (rule) => {
  if (!rule) return null;
  const minBudget = money(rule.minBudget);
  const maxBudget = money(rule.maxBudget);
  return {
    id: rule.id,
    name: rule.name,
    label: rule.name,
    budgetRange: formatBudgetRange(minBudget, maxBudget),
    minBudget,
    maxBudget,
    tokenCost: rule.tokenCost,
    price: money(rule.price) || 0,
    description: rule.description,
    isActive: rule.isActive,
    status: rule.isActive ? "Active" : "Inactive",
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
};

const rangeTop = (maxBudget) =>
  maxBudget === null || maxBudget === undefined
    ? Number.POSITIVE_INFINITY
    : Number(maxBudget);

const rangesOverlap = (aMin, aMax, bMin, bMax) => {
  return Number(aMin) < rangeTop(bMax) && Number(bMin) < rangeTop(aMax);
};

const assertNoOverlap = async ({ minBudget, maxBudget, excludeId, isActive = true }) => {
  if (isActive === false) return;

  const others = await prisma.tokenRule.findMany({
    where: {
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const clash = others.find((rule) =>
    rangesOverlap(minBudget, maxBudget, money(rule.minBudget), money(rule.maxBudget))
  );

  if (clash) {
    throw new ApiError(
      400,
      `This budget range overlaps "${clash.name}" (${serializeRule(clash).budgetRange})`
    );
  }
};

const listRules = async () => {
  const rules = await prisma.tokenRule.findMany({
    orderBy: [{ minBudget: "asc" }, { tokenCost: "asc" }],
  });
  return rules.map(serializeRule);
};

const listActiveRules = async () => {
  const rules = await prisma.tokenRule.findMany({
    where: { isActive: true },
    orderBy: [{ minBudget: "asc" }, { tokenCost: "asc" }],
  });
  return rules.map(serializeRule);
};

const createRule = async (payload) => {
  const minBudget = Number(payload.minBudget);
  const maxBudget =
    payload.maxBudget === undefined || payload.maxBudget === null || payload.maxBudget === ""
      ? null
      : Number(payload.maxBudget);
  const isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);

  if (maxBudget !== null && maxBudget < minBudget) {
    throw new ApiError(400, "maxBudget cannot be less than minBudget");
  }

  await assertNoOverlap({ minBudget, maxBudget, isActive });

  const created = await prisma.tokenRule.create({
    data: {
      name: payload.name.trim(),
      minBudget,
      maxBudget,
      tokenCost: Number(payload.tokenCost),
      price: Number(payload.price),
      description: payload.description || null,
      isActive,
    },
  });

  return serializeRule(created);
};

const updateRule = async (id, payload) => {
  const existing = await prisma.tokenRule.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Token rule not found");
  }

  const minBudget =
    payload.minBudget === undefined ? money(existing.minBudget) : Number(payload.minBudget);
  const maxBudget =
    payload.maxBudget === undefined
      ? money(existing.maxBudget)
      : payload.maxBudget === null || payload.maxBudget === ""
        ? null
        : Number(payload.maxBudget);
  const isActive =
    payload.isActive === undefined ? existing.isActive : Boolean(payload.isActive);

  if (maxBudget !== null && maxBudget < minBudget) {
    throw new ApiError(400, "maxBudget cannot be less than minBudget");
  }

  await assertNoOverlap({ minBudget, maxBudget, excludeId: id, isActive });

  const data = {
    name: payload.name !== undefined ? payload.name.trim() : undefined,
    minBudget: payload.minBudget !== undefined ? minBudget : undefined,
    tokenCost: payload.tokenCost !== undefined ? Number(payload.tokenCost) : undefined,
    price: payload.price !== undefined ? Number(payload.price) : undefined,
    description: payload.description !== undefined ? payload.description : undefined,
    isActive: payload.isActive !== undefined ? isActive : undefined,
  };

  if (payload.maxBudget !== undefined) {
    data.maxBudget = maxBudget;
  }

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  const updated = await prisma.tokenRule.update({ where: { id }, data });
  return serializeRule(updated);
};

const deleteRule = async (id) => {
  const existing = await prisma.tokenRule.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Token rule not found");
  }
  await prisma.tokenRule.delete({ where: { id } });
  return { id };
};

const findMatchingRule = async (budgetMax) => {
  const amount = Number(budgetMax);
  const rules = await prisma.tokenRule.findMany({
    where: { isActive: true },
    orderBy: { minBudget: "desc" },
  });

  return rules.find((rule) => {
    const min = money(rule.minBudget) || 0;
    const max = money(rule.maxBudget);
    if (amount < min) return false;
    if (max === null || max === undefined) return true;
    return amount <= max;
  });
};

const resolveLeadPrice = async (budgetMax) => {
  const match = await findMatchingRule(budgetMax);
  if (!match) {
    throw new ApiError(400, "No token rule matches this quotation amount");
  }
  return match.tokenCost;
};

const resolveQuoteCharge = async (quotationAmount) => {
  const match = await findMatchingRule(quotationAmount);
  if (!match) {
    throw new ApiError(400, "No token rule matches this quotation amount");
  }

  const price = money(match.price);
  if (!price || price <= 0) {
    throw new ApiError(400, "Admin has not set a Stripe price for this quotation range");
  }

  return {
    tokenCost: match.tokenCost,
    price,
    rule: serializeRule(match),
  };
};

module.exports = {
  listRules,
  listActiveRules,
  createRule,
  updateRule,
  deleteRule,
  resolveLeadPrice,
  resolveQuoteCharge,
  serializeRule,
};
