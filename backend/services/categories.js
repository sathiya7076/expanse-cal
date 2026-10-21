import AppError from '../utils/AppError.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SALARY_CATEGORY } from '../config/constants.js';

export function assertCategory(type, category) {
  const allowed = type === 'income' ? [SALARY_CATEGORY, ...INCOME_CATEGORIES] : EXPENSE_CATEGORIES;
  if (!allowed.includes(category)) throw new AppError(`"${category}" is not a valid ${type} category.`, 400);
}
