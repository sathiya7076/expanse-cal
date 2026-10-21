import asyncHandler from '../utils/asyncHandler.js';
import { periodFrom } from '../utils/dates.js';
import { getDashboardSummary } from '../services/summaryService.js';

export const summary = asyncHandler(async (req, res) => {
  const { year, month } = periodFrom(req.query);
  res.json(await getDashboardSummary(req.user._id, year, month));
});
