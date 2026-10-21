import rateLimit from 'express-rate-limit';

const make = (limit, windowMs, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { message } });

export const apiLimiter = make(600, 15 * 60 * 1000, 'Too many requests. Try again in a few minutes.');
export const authLimiter = make(20, 15 * 60 * 1000, 'Too many attempts. Try again in 15 minutes.');
export const uploadLimiter = make(30, 15 * 60 * 1000, 'Too many receipt uploads. Try again in a few minutes.');
