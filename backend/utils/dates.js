export const monthRange = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});
export const yearRange = (year) => ({
  start: new Date(Date.UTC(year, 0, 1)),
  end: new Date(Date.UTC(year + 1, 0, 1)),
});
export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Reads ?year&month (already validated) and falls back to the current UTC month. */
export function periodFrom(query) {
  const now = new Date();
  return {
    year: Number(query.year) || now.getUTCFullYear(),
    month: Number(query.month) || now.getUTCMonth() + 1,
  };
}
