import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

/** Verifies the Bearer token and loads req.user. Controllers always scope queries by req.user._id. */
export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Log in to continue.', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Your session has expired. Log in again.', 401);
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Your session is no longer valid. Log in again.', 401);
  req.user = user;
  next();
});
