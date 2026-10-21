import fsp from 'node:fs/promises';
import path from 'node:path';
import Transaction from '../models/Transaction.js';
import { env } from '../config/env.js';

const NAME_RX = /^[a-f0-9]{24}-[a-f0-9]{32}\.(jpg|png|webp)$/;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Removes scanned images that were never confirmed (older than 24 hours and not attached to a transaction). */
export async function cleanOrphanUploads() {
  const files = await fsp.readdir(env.uploadDir).catch(() => []);
  for (const file of files) {
    if (!NAME_RX.test(file)) continue;
    const full = path.join(env.uploadDir, file);
    const stat = await fsp.stat(full).catch(() => null);
    if (!stat || Date.now() - stat.mtimeMs < MAX_AGE_MS) continue;
    const used = await Transaction.exists({ receiptImage: `uploads/${file}` });
    if (!used) await fsp.unlink(full).catch(() => {});
  }
}
