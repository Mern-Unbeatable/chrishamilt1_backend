const nextJobCode = (lastCode) => {
  if (!lastCode) return "Job-001";
  const match = String(lastCode).match(/(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `Job-${String(next).padStart(3, "0")}`;
};

module.exports = { nextJobCode };
