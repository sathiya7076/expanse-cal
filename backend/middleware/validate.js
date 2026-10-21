import { validationResult } from 'express-validator';

export default function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, msg: e.msg }));
  res.status(400).json({ message: errors[0].msg, errors });
}
