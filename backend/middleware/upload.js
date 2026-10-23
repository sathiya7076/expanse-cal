import crypto from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import AppError from '../utils/AppError.js';
import { env } from '../config/env.js';
import { MAX_UPLOAD_BYTES } from '../config/constants.js';

// Do not crash the whole server if the folder cannot be created (for example on a read-only host).
try {
  fs.mkdirSync(env.uploadDir, { recursive: true });
} catch (e) {
  console.error('Could not create upload folder:', e.message);
}

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  // Never use the client's file name: <userId>-<random>.<ext>
  filename: (req, file, cb) => cb(null, `${req.user._id}-${crypto.randomBytes(16).toString('hex')}${EXT[file.mimetype]}`),
});

export default multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new AppError('Upload a JPG, PNG or WebP image.', 400)),
});