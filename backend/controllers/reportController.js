import asyncHandler from '../utils/asyncHandler.js';
import { monthRange, periodFrom } from '../utils/dates.js';
import { expensesByCategory, getMonthlyReport, getYearlyReport } from '../services/summaryService.js';

export const monthly = asyncHandler(async (req, res) => {
  const { year, month } = periodFrom(req.query);
  res.json(await getMonthlyReport(req.user._id, year, month));
});

export const yearly = asyncHandler(async (req, res) => {
  const { year } = periodFrom(req.query);
  res.json(await getYearlyReport(req.user._id, year));
});

export const categories = asyncHandler(async (req, res) => {
  const { year, month } = periodFrom(req.query);
  res.json({ categories: await expensesByCategory(req.user._id, monthRange(year, month)) });
});
