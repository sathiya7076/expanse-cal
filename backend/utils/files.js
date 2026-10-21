import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/** Checks the file's magic bytes so a renamed non-image cannot slip past the MIME check. */
export async function sniffImageType(filePath) {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
  } finally {
    await handle.close();
  }
}

export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (c) => hash.update(c))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

export async function safeUnlink(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch {
    /* already gone */
  }
}

export const fileExists = (filePath) => fsp.access(filePath).then(() => true, () => false);

const NAME_RX = /^[a-f0-9]{24}-[a-f0-9]{32}\.(jpg|png|webp)$/;

/**
 * Maps a client-supplied receiptImage value to a path inside the upload folder.
 * Returns null unless the file name is one we generated AND it belongs to this user.
 */
export function resolveUpload(uploadDir, userId, receiptImage) {
  const name = path.basename(String(receiptImage || ''));
  if (!NAME_RX.test(name) || !name.startsWith(`${userId}-`)) return null;
  return path.join(uploadDir, name);
}
