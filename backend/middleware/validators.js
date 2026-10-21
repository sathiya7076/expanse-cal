import { body, param, query } from 'express-validator';
import { FREQUENCIES } from '../config/constants.js';

const text = (field, { min = 1, max = 200, label = field } = {}) =>
  body(field).isString().withMessage(`${label} must be text.`).bail().trim()
    .isLength({ min, max }).withMessage(min ? `${label} must be ${min}-${max} characters.` : `${label} is too long.`);
const optText = (field, max = 500) =>
  body(field).optional({ values: 'null' }).isString().withMessage(`${field} must be text.`).bail().trim()
    .isLength({ max }).withMessage(`${field} must be at most ${max} characters.`);
const amount = (field, label = 'Amount') =>
  body(field).isFloat({ min: 0.01, max: 1e9 }).withMessage(`${label} must be greater than 0.`).toFloat();
const date = (field, label = 'Date') => body(field).isISO8601().withMessage(`${label} must be a valid date.`);

export const idParam = [param('id').isMongoId().withMessage('Invalid id.')];

// ---- auth ----
export const registerRules = [
  text('name', { min: 2, max: 80, label: 'Name' }),
  body('email').isString().bail().trim().toLowerCase().isEmail().withMessage('Enter a valid email address.').isLength({ max: 254 }),
  body('password').isString().withMessage('Enter a password.').bail().isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters.'),
];
export const loginRules = [
  body('email').isString().bail().trim().toLowerCase().isEmail().withMessage('Enter a valid email address.'),
  body('password').isString().notEmpty().withMessage('Enter your password.'),
];

// ---- transactions ----
export const createTransactionRules = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense.'),
  text('category', { max: 60, label: 'Category' }),
  text('description', { max: 200, label: 'Description' }),
  amount('amount'),
  date('date'),
  optText('paymentMethod', 50),
  optText('notes'),
  body('salaryId').optional({ values: 'null' }).isMongoId().withMessage('Invalid salary id.'),
];
export const updateTransactionRules = [
  ...idParam,
  text('category', { max: 60, label: 'Category' }),
  text('description', { max: 200, label: 'Description' }),
  amount('amount'),
  date('date'),
  optText('paymentMethod', 50),
  optText('notes'),
];
export const listTransactionRules = [
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense.'),
  query('q').optional().isString().withMessage('Invalid search.').bail().isLength({ max: 100 }),
  query('category').optional().isString().withMessage('Invalid category.').bail().isLength({ max: 60 }),
  query('from').optional().isISO8601().withMessage('From must be a valid date.'),
  query('to').optional().isISO8601().withMessage('To must be a valid date.'),
  query('sort').optional().isIn(['date', 'amount']).withMessage('Sort by date or amount.'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc.'),
];

// ---- salary ----
export const salaryRules = [
  text('employeeName', { max: 100, label: 'Employee name' }),
  text('companyName', { max: 100, label: 'Company name' }),
  amount('amount', 'Salary'),
  body('paymentFrequency').optional().isIn(FREQUENCIES).withMessage(`Frequency must be one of: ${FREQUENCIES.join(', ')}.`),
  date('paymentDate', 'Payment date'),
  optText('notes'),
];

// ---- budgets ----
export const budgetRules = [
  text('category', { max: 60, label: 'Category' }),
  amount('amount', 'Budget'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12.').toInt(),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100.').toInt(),
];

// ---- savings goals ----
export const goalRules = [
  text('name', { max: 100, label: 'Goal name' }),
  body('targetAmount').isFloat({ min: 0.01, max: 1e10 }).withMessage('Target must be greater than 0.').toFloat(),
  body('currentAmount').optional().isFloat({ min: 0, max: 1e10 }).withMessage('Saved amount cannot be negative.').toFloat(),
  body('targetDate').optional({ values: 'falsy' }).isISO8601().withMessage('Target date must be a valid date.'),
];
export const goalUpdateRules = [
  ...idParam,
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Goal name must be 1-100 characters.'),
  body('targetAmount').optional().isFloat({ min: 0.01, max: 1e10 }).withMessage('Target must be greater than 0.').toFloat(),
  body('currentAmount').optional().isFloat({ min: 0, max: 1e10 }).withMessage('Saved amount cannot be negative.').toFloat(),
  body('targetDate').optional({ values: 'falsy' }).isISO8601().withMessage('Target date must be a valid date.'),
];

// ---- period filters (dashboard, budgets, reports) ----
export const periodQuery = [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12.').toInt(),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100.').toInt(),
];

// ---- receipts ----
export const confirmReceiptRules = [
  text('category', { max: 60, label: 'Category' }),
  text('description', { max: 200, label: 'Description' }),
  amount('amount', 'Total amount'),
  date('date', 'Receipt date'),
  optText('paymentMethod', 50),
  optText('notes'),
  text('receiptImage', { max: 200, label: 'Receipt image' }),
];
