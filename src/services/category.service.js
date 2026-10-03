const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toSlug } = require("../utils/slug");

const normalizeIcon = (icon) => {
  if (icon === undefined || icon === null || icon === "") return null;
  return toSlug(icon);
};

const listCategories = async () => {
  return prisma.category.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { jobs: true } } },
  });
};

// Create a new category
const createCategory = async ({ name, icon }) => {
  const slug = toSlug(name);
  const iconKey = normalizeIcon(icon);

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });

  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  return prisma.category.create({
    data: { name, slug, icon: iconKey },
  });
};

// Update a category
const updateCategory = async (id, { name, icon }) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const data = {};

  if (name !== undefined) {
    const slug = toSlug(name);
    const clash = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [{ name }, { slug }],
      },
    });
    if (clash) {
      throw new ApiError(409, "Category already exists");
    }
    data.name = name;
    data.slug = slug;
  }

  if (icon !== undefined) {
    data.icon = normalizeIcon(icon);
  }

  return prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { jobs: true } } },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (category._count.jobs > 0) {
    throw new ApiError(400, "Cannot delete a category that has jobs");
  }

  await prisma.category.delete({ where: { id } });
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
