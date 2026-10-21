import path from 'node:path';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { fileExists, resolveUpload, safeUnlink, sha256File, sniffImageType } from '../utils/files.js';
import { round2 } from '../utils/money.js';
import { assertCategory } from '../services/categories.js';
import { extractText } from '../services/ocrService.js';
import { parseReceipt } from '../services/receiptParser.js';
import { findDuplicate } from '../services/receiptService.js';
import { env } from '../config/env.js';

/** Reads a receipt and returns suggested fields. Nothing is saved here. */
export const scan = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose a receipt image to upload.', 400);
  const filePath = req.file.path;

  try {
    if (!(await sniffImageType(filePath))) throw new AppError('That file is not a valid JPG, PNG or WebP image.', 400);

    const receiptHash = await sha256File(filePath);
    const ocr = await extractText(filePath);
    if (!ocr.text.trim()) {
      throw new AppError('We could not find any text in that image. Try a clearer, well-lit photo.', 422);
    }

    const { fields, confidence } = parseReceipt(ocr.text, ocr.confidence);
    const duplicate = await findDuplicate(req.user._id, receiptHash, fields);

    res.json({
      extractedText: ocr.text,
      fields,
      confidence,
      receiptImage: `uploads/${req.file.filename}`,
      receiptHash,
      duplicate,
    });
  } catch (err) {
    await safeUnlink(filePath); // do not keep files from failed scans
    throw err;
  }
});

/** Saves the expense the user reviewed. The hash is recomputed from the stored file, never trusted from the client. */
export const confirm = asyncHandler(async (req, res) => {
  const b = req.body;
  assertCategory('expense', b.category);

  const filePath = resolveUpload(env.uploadDir, req.user.id, b.receiptImage);
  if (!filePath || !(await fileExists(filePath))) {
    throw new AppError('That receipt image was not found. Scan the receipt again.', 400);
  }
  const receiptHash = await sha256File(filePath);

  if (await Transaction.exists({ userId: req.user._id, receiptHash })) {
    throw new AppError('This receipt has already been saved.', 409);
  }

  try {
    const tx = await Transaction.create({
      userId: req.user._id,
      type: 'expense',
      category: b.category,
      description: b.description,
      amount: round2(b.amount),
      date: b.date,
      paymentMethod: b.paymentMethod || '',
      notes: b.notes || '',
      receiptImage: `uploads/${path.basename(filePath)}`,
      receiptHash,
      source: 'receipt',
    });
    res.status(201).json(tx);
  } catch (err) {
    if (err.code === 11000) throw new AppError('This receipt has already been saved.', 409);
    throw err;
  }
});
