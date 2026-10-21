import Salary from '../models/Salary.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { round2 } from '../utils/money.js';

const pick = (b) => ({
  employeeName: b.employeeName,
  companyName: b.companyName,
  amount: round2(b.amount),
  paymentFrequency: b.paymentFrequency || 'Monthly',
  paymentDate: b.paymentDate,
  notes: b.notes || '',
});

export const list = asyncHandler(async (req, res) => {
  const salaries = await Salary.find({ userId: req.user._id }).sort({ paymentDate: -1, createdAt: -1 }).lean();
  res.json({ salaries });
});

export const create = asyncHandler(async (req, res) => {
  const salary = await Salary.create({ ...pick(req.body), userId: req.user._id });
  res.status(201).json(salary);
});

export const update = asyncHandler(async (req, res) => {
  const salary = await Salary.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: pick(req.body) },
    { new: true, runValidators: true }
  );
  if (!salary) throw new AppError('Salary details not found.', 404);
  res.json(salary);
});

export const remove = asyncHandler(async (req, res) => {
  const salary = await Salary.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!salary) throw new AppError('Salary details not found.', 404);
  res.json({ message: 'Salary details deleted.' });
});
