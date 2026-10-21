import SavingsGoal from '../models/SavingsGoal.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { round2 } from '../utils/money.js';

export const list = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ goals });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const goal = await SavingsGoal.create({
    userId: req.user._id,
    name: b.name,
    targetAmount: round2(b.targetAmount),
    currentAmount: round2(b.currentAmount || 0),
    targetDate: b.targetDate || null,
  });
  res.status(201).json(goal);
});

// Partial update: the frontend sends only { currentAmount } when adding progress.
export const update = asyncHandler(async (req, res) => {
  const b = req.body;
  const set = {};
  if (b.name !== undefined) set.name = b.name;
  if (b.targetAmount !== undefined) set.targetAmount = round2(b.targetAmount);
  if (b.currentAmount !== undefined) set.currentAmount = round2(b.currentAmount);
  if (b.targetDate !== undefined) set.targetDate = b.targetDate || null;

  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: set },
    { new: true, runValidators: true }
  );
  if (!goal) throw new AppError('Savings goal not found.', 404);
  res.json(goal);
});

export const remove = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!goal) throw new AppError('Savings goal not found.', 404);
  res.json({ message: 'Savings goal deleted.' });
});
