import Transaction from '../models/Transaction.js';
import SavingsGoal from '../models/SavingsGoal.js';
import { SALARY_CATEGORY } from '../config/constants.js';
import { daysInMonth, monthRange, yearRange } from '../utils/dates.js';
import { round2 } from '../utils/money.js';

const inRange = ({ start, end }) => ({ $gte: start, $lt: end });

/** Groups by `keyExpr` and type, returns Map(key -> { income, expenses }). */
async function incomeExpenseBy(userId, range, keyExpr) {
  const rows = await Transaction.aggregate([
    { $match: { userId, date: inRange(range) } },
    { $group: { _id: { k: keyExpr, type: '$type' }, total: { $sum: '$amount' } } },
  ]);
  const map = new Map();
  for (const r of rows) {
    const entry = map.get(r._id.k) || { income: 0, expenses: 0 };
    if (r._id.type === 'income') entry.income += r.total;
    else entry.expenses += r.total;
    map.set(r._id.k, entry);
  }
  return map;
}

export async function expensesByCategory(userId, range) {
  const rows = await Transaction.aggregate([
    { $match: { userId, type: 'expense', date: inRange(range) } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ]);
  return rows.map((r) => ({ category: r._id, total: round2(r.total) }));
}

export async function getDashboardSummary(userId, year, month) {
  const range = monthRange(year, month);
  const yr = yearRange(year);

  const [totals, categoryBreakdown, monthlyRows, recentTransactions, goalTotals] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId, date: inRange(range) } },
      { $group: { _id: { type: '$type', salary: { $eq: ['$category', SALARY_CATEGORY] } }, total: { $sum: '$amount' } } },
    ]),
    expensesByCategory(userId, range),
    Transaction.aggregate([
      { $match: { userId, type: 'expense', date: inRange(yr) } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
    ]),
    Transaction.find({ userId, date: inRange(range) }).sort({ date: -1, createdAt: -1 }).limit(8).lean(),
    SavingsGoal.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$currentAmount' } } }]),
  ]);

  // Salary payments are income transactions, so salary is counted once: totalIncome = salary + additional.
  let monthlySalary = 0;
  let additionalIncome = 0;
  let totalExpenses = 0;
  for (const t of totals) {
    if (t._id.type === 'expense') totalExpenses += t.total;
    else if (t._id.salary) monthlySalary += t.total;
    else additionalIncome += t.total;
  }
  const totalIncome = monthlySalary + additionalIncome;

  const byMonth = new Map(monthlyRows.map((r) => [r._id, r.total]));
  const monthlySpending = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: round2(byMonth.get(i + 1) || 0) }));

  return {
    monthlySalary: round2(monthlySalary),
    additionalIncome: round2(additionalIncome),
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    remainingBalance: round2(totalIncome - totalExpenses),
    totalSavings: round2(goalTotals[0]?.total || 0), // tracked in savings goals, never derived from the balance
    highestCategory: categoryBreakdown[0] || null,
    categoryBreakdown,
    monthlySpending,
    recentTransactions,
  };
}

export async function getMonthlyReport(userId, year, month) {
  const range = monthRange(year, month);
  const [daily, weekly] = await Promise.all([
    incomeExpenseBy(userId, range, { $dayOfMonth: '$date' }),
    incomeExpenseBy(userId, range, { $ceil: { $divide: [{ $dayOfMonth: '$date' }, 7] } }),
  ]);

  const total = daysInMonth(year, month);
  let income = 0;
  let expenses = 0;
  const dailyRows = Array.from({ length: total }, (_, i) => {
    const e = daily.get(i + 1) || { income: 0, expenses: 0 };
    income += e.income;
    expenses += e.expenses;
    const date = new Date(Date.UTC(year, month - 1, i + 1)).toISOString().slice(0, 10);
    return { date, income: round2(e.income), expenses: round2(e.expenses) };
  });

  const weeks = Math.ceil(total / 7);
  const weeklyRows = Array.from({ length: weeks }, (_, i) => {
    const w = i + 1;
    const e = weekly.get(w) || { income: 0, expenses: 0 };
    const last = Math.min(w * 7, total);
    return { label: `Week ${w} (${(w - 1) * 7 + 1}-${last})`, income: round2(e.income), expenses: round2(e.expenses) };
  });

  return {
    summary: { income: round2(income), expenses: round2(expenses), net: round2(income - expenses) },
    daily: dailyRows,
    weekly: weeklyRows,
  };
}

export async function getYearlyReport(userId, year) {
  const byMonth = await incomeExpenseBy(userId, yearRange(year), { $month: '$date' });
  return {
    months: Array.from({ length: 12 }, (_, i) => {
      const e = byMonth.get(i + 1) || { income: 0, expenses: 0 };
      return { month: i + 1, income: round2(e.income), expenses: round2(e.expenses) };
    }),
  };
}
