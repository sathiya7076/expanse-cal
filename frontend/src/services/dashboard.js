import api from './api';

export const getSummary = (params) => api.get('/dashboard/summary', { params }).then((r) => r.data);
export const getMonthlyReport = (params) => api.get('/reports/monthly', { params }).then((r) => r.data);
export const getYearlyReport = (params) => api.get('/reports/yearly', { params }).then((r) => r.data);
export const getCategoryReport = (params) =>
  api.get('/reports/categories', { params }).then((r) => r.data.categories ?? r.data);
