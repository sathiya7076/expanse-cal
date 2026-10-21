import path from 'node:path';
import Salary from '../models/Salary.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/regex.js';
import { round2 } from '../utils/money.js';
import { safeUnlink } from '../utils/files.js';
import { assertCategory } from '../services/categories.js';
import { salaryPeriodKey } from '../services/salaryPeriod.js';
import { SALARY_CATEGORY } from '../config/constants.js';
import { env } from '../config/env.js';

const SALARY_DUPLICATE = 'A salary payment for this pay period is already recorded.';

export const list = asyncHandler(async (req, res) => {
  const { type, q, category, from, to, sort = 'date', order = 'desc' } = req.query;
  // Every value below was validated as a string, so query operators like {$ne: ...} cannot get through.
  const filter = { userId: req.user._id };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setUTCDate(end.getUTCDate() + 1); // "to" is inclusive
      filter.date.$lt = end;
    }
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ description: rx }, { notes: rx }];
  }
  const dir = order === 'asc' ? 1 : -1;
  const sortSpec = sort === 'amount' ? { amount: dir, date: -1 } : { date: dir, createdAt: dir };
  const transactions = await Transaction.find(filter).sort(sortSpec).limit(1000).lean();
  res.json({ transactions });
});

export const getOne = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!tx) throw new AppError('Transaction not found.', 404);
  res.json(tx);
});

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  assertCategory(b.type, b.category);

  const data = {
    userId: req.user._id, // never taken from the request body
    type: b.type,
    category: b.category,
    description: b.description,
    amount: round2(b.amount),
    date: b.date,
    paymentMethod: b.paymentMethod || '',
    notes: b.notes || '',
    source: 'manual',
  };

  if (b.salaryId) {
    if (b.type !== 'income' || b.category !== SALARY_CATEGORY) {
      throw new AppError('Salary payments must be income in the Salary category.', 400);
    }
    const salary = await Salary.findOne({ _id: b.salaryId, userId: req.user._id });
    if (!salary) throw new AppError('Salary details not found.', 404);
    data.salaryId = salary._id;
    data.periodKey = salaryPeriodKey(b.date, salary.paymentFrequency);
  }

  try {
    res.status(201).json(await Transaction.create(data));
  } catch (err) {
    if (err.code === 11000) throw new AppError(SALARY_DUPLICATE, 409);
    throw err;
  }
});

export const update = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new AppError('Transaction not found.', 404);

  const b = req.body;
  assertCategory(tx.type, b.category); // the type cannot be changed after creation
  tx.category = b.category;
  tx.description = b.description;
  tx.amount = round2(b.amount);
  tx.date = b.date;
  tx.paymentMethod = b.paymentMethod || '';
  tx.notes = b.notes || '';

  if (tx.salaryId) {
    const salary = await Salary.findOne({ _id: tx.salaryId, userId: req.user._id });
    tx.periodKey = salaryPeriodKey(b.date, salary?.paymentFrequency || 'Monthly');
  }

  try {
    res.json(await tx.save());
  } catch (err) {
    if (err.code === 11000) throw new AppError(SALARY_DUPLICATE, 409);
    throw err;
  }
});

export const remove = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new AppError('Transaction not found.', 404);
  if (tx.receiptImage) await safeUnlink(path.join(env.uploadDir, path.basename(tx.receiptImage)));
  res.json({ message: 'Transaction deleted.' });
});
