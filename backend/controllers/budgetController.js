import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { round2 } from '../utils/money.js';
import { assertCategory } from '../services/categories.js';

const DUPLICATE = 'A budget for this category and month already exists.';
const pick = (b) => ({ category: b.category, amount: round2(b.amount), month: b.month, year: b.year });

/** Adds `spent` to each budget, calculated from the user's expenses for that category and month. */
async function withSpent(userId, budgets) {
  if (!budgets.length) return [];
  const start = new Date(Math.min(...budgets.map((b) => Date.UTC(b.year, b.month - 1, 1))));
  const end = new Date(Math.max(...budgets.map((b) => Date.UTC(b.year, b.month, 1))));
  const rows = await Transaction.aggregate([
    { $match: { userId, type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' }, c: '$category' }, total: { $sum: '$amount' } } },
  ]);
  const spent = new Map(rows.map((r) => [`${r._id.y}-${r._id.m}-${r._id.c}`, r.total]));
  return budgets.map((b) => {
    const s = round2(spent.get(`${b.year}-${b.month}-${b.category}`) || 0);
    return { ...b, spent: s, remaining: round2(b.amount - s) };
  });
}

export const list = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.month) filter.month = Number(req.query.month);
  if (req.query.year) filter.year = Number(req.query.year);
  const budgets = await Budget.find(filter).sort({ year: -1, month: -1, category: 1 }).lean();
  res.json({ budgets: await withSpent(req.user._id, budgets) });
});

export const create = asyncHandler(async (req, res) => {
  assertCategory('expense', req.body.category);
  try {
    const budget = await Budget.create({ ...pick(req.body), userId: req.user._id });
    res.status(201).json(budget);
  } catch (err) {
    if (err.code === 11000) throw new AppError(DUPLICATE, 409);
    throw err;
  }
});

export const update = asyncHandler(async (req, res) => {
  assertCategory('expense', req.body.category);
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: pick(req.body) },
      { new: true, runValidators: true }
    );
    if (!budget) throw new AppError('Budget not found.', 404);
    res.json(budget);
  } catch (err) {
    if (err.code === 11000) throw new AppError(DUPLICATE, 409);
    throw err;
  }
});

export const remove = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!budget) throw new AppError('Budget not found.', 404);
  res.json({ message: 'Budget deleted.' });
});
