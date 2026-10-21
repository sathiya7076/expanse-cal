import path from 'node:path';
import { createWorker } from 'tesseract.js';
import AppError from '../utils/AppError.js';

let worker = null;
let queue = Promise.resolve();

async function getWorker() {
  if (!worker) {
    // Language data is downloaded on first use and cached here.
    worker = await createWorker('eng', 1, { cachePath: path.resolve('.tesseract-cache') });
  }
  return worker;
}

/** Runs OCR one image at a time on a shared worker. Returns { text, confidence (0-100) }. */
export function extractText(imagePath) {
  const run = queue.then(async () => {
    try {
      const w = await getWorker();
      const { data } = await w.recognize(imagePath);
      return { text: data.text || '', confidence: data.confidence || 0 };
    } catch (err) {
      worker = null; // start fresh next time
      console.error('OCR failed:', err.message);
      throw new AppError('We could not read that receipt. Try a clearer, well-lit photo.', 422);
    }
  });
  queue = run.catch(() => {});
  return run;
}

export async function shutdownOcr() {
  if (worker) await worker.terminate();
  worker = null;
}
