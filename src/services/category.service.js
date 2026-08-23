const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { toSlug } = require("../utils/slug");

const listCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { jobs: true } } },
  });
};

const createCategory = async (name) => {
  const slug = toSlug(name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });

  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  return prisma.category.create({ data: { name, slug } });
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

module.exports = { listCategories, createCategory, deleteCategory };
