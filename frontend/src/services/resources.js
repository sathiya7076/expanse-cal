import { makeCrud } from './crud';

export const transactionsApi = makeCrud('/transactions', 'transactions');
export const salaryApi = makeCrud('/salary', 'salaries');
export const budgetsApi = makeCrud('/budgets', 'budgets');
export const goalsApi = makeCrud('/savings-goals', 'goals');
