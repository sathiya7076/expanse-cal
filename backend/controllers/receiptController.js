import path from 'node:path';
import fs from 'node:fs/promises';
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

/* =====================================================================
   NEW: automatic add. Everything below is additional; the code above is unchanged.
   Upload an image -> expense and income entries are saved automatically.
   Printed bills use your existing OCR + parser. Handwritten notes (or bills the
   parser could not finish) are read with Claude vision (needs ANTHROPIC_API_KEY).
   ===================================================================== */

const INCOME_HINTS = /\b(salary|credited|credit alert|received from|payment received|refund|cashback|interest credited|deposit)\b/i;
const detectType = (text) => (INCOME_HINTS.test(text) ? 'income' : 'expense');

const VISION_CATEGORIES = {
  expense: ['Food', 'Groceries', 'Transport', 'Travel', 'Shopping', 'Medical', 'Electricity', 'Mobile Recharge', 'Education', 'Entertainment', 'Rent', 'Other'],
  income: ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'],
};
const CATEGORY_FALLBACKS = ['Other', 'Others', 'Miscellaneous', 'Misc'];

// Returns a category name your app accepts for this type, or null.
const validCategory = (type, wanted) => {
  for (const name of [wanted, ...CATEGORY_FALLBACKS]) {
    if (!name) continue;
    try {
      assertCategory(type, name);
      return name;
    } catch {
      /* try the next name */
    }
  }
  return null;
};

const today = () => new Date().toISOString().slice(0, 10);

const VISION_PROMPT = `You are reading a photo of a handwritten note, bill or receipt that lists money entries.
Return ONLY valid JSON, no explanation, in exactly this shape:
{"entries":[{"type":"expense","category":"Food","description":"Food","amount":500,"date":null}]}

Rules:
- One object in "entries" for every line that has an amount. Read handwriting carefully.
- "type" is "income" or "expense". Salary, Credited, Received, Refund are income. Lines under a heading like "Expense", and normal spending (food, travel, bills), are expense.
- "category" must be exactly one of:
  expense: ${VISION_CATEGORIES.expense.join(', ')}
  income: ${VISION_CATEGORIES.income.join(', ')}
  Use "Other" when nothing fits.
- "description" is a short label from the note (for example "Food" or "Salary").
- "amount" is a plain positive number. No currency symbol, no commas.
- "date" is YYYY-MM-DD only if a date is clearly written, otherwise null.
- Ignore headings, titles and anything that is not a money entry.
- If you find no money entries, return {"entries":[]}.`;

function cleanVisionEntry(e) {
  const type = e?.type === 'income' ? 'income' : 'expense';
  const amount = Number(String(e?.amount ?? '').replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(e?.date || '') ? e.date : null;
  const description = String(e?.description || e?.category || '').trim().slice(0, 120) || (type === 'income' ? 'Income' : 'Expense');
  return { type, category: String(e?.category || ''), description, amount, date };
}

async function readEntriesWithVision(filePath, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AppError('Handwriting reading is not set up yet. Add ANTHROPIC_API_KEY to the backend .env file.', 503);

  const data = (await fs.readFile(filePath)).toString('base64');

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data } },
              { type: 'text', text: VISION_PROMPT },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new AppError('Could not reach the handwriting reader. Try again in a moment.', 502);
  }
  if (!response.ok) throw new AppError('The handwriting reader failed. Check ANTHROPIC_API_KEY and your API credit.', 502);

  const json = await response.json();
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return (Array.isArray(parsed.entries) ? parsed.entries : []).map(cleanVisionEntry).filter(Boolean);
  } catch {
    return [];
  }
}

/** Reads an image and saves every expense / income entry it finds. */
export const autoAdd = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose an image to upload.', 400);
  const filePath = req.file.path;
  let savedAny = false;

  try {
    if (!(await sniffImageType(filePath))) throw new AppError('That file is not a valid JPG, PNG or WebP image.', 400);

    const receiptHash = await sha256File(filePath);
    if (await Transaction.exists({ userId: req.user._id, receiptHash })) {
      throw new AppError('This image has already been saved.', 409);
    }

    // 1) Printed bill: your existing OCR + parser. Only used when it found everything.
    let entries = [];
    let ocr = null;
    try {
      ocr = await extractText(filePath);
    } catch {
      ocr = null;
    }
    if (ocr?.text?.trim()) {
      const { fields } = parseReceipt(ocr.text, ocr.confidence);
      if (fields.amount && fields.category && fields.date) {
        const duplicate = await findDuplicate(req.user._id, receiptHash, fields);
        if (duplicate?.isDuplicate) {
          throw new AppError(duplicate.message || 'This receipt looks like one you already saved.', 422);
        }
        const type = detectType(ocr.text);
        entries = [
          {
            type,
            category: type === 'income' ? (/salary/i.test(ocr.text) ? 'Salary' : 'Other') : fields.category,
            description: fields.description || fields.merchant || 'Receipt',
            amount: fields.amount,
            date: fields.date,
          },
        ];
      }
    }

    // 2) Handwriting or incomplete bill: read it with vision.
    if (!entries.length) entries = await readEntriesWithVision(filePath, req.file.mimetype);
    if (!entries.length) throw new AppError('We could not find any amounts in that image.', 422);

    const saved = [];
    const skipped = [];

    for (const e of entries) {
      const category = validCategory(e.type, e.category);
      if (!category) {
        skipped.push(e);
        continue;
      }
      const tx = await Transaction.create({
        userId: req.user._id,
        type: e.type,
        category,
        description: e.description,
        amount: round2(e.amount),
        date: e.date || today(),
        paymentMethod: '',
        notes: 'Added automatically from image',
        receiptImage: `uploads/${path.basename(filePath)}`,
        // The hash is unique per user, so only the first saved entry carries it.
        ...(saved.length === 0 ? { receiptHash } : {}),
        source: 'receipt',
      });
      saved.push(tx);
      savedAny = true;
    }

    if (!saved.length) throw new AppError('We found entries but could not match their categories.', 422);
    res.status(201).json({ saved, skipped });
  } catch (err) {
    if (!savedAny) await safeUnlink(filePath);
    throw err;
  }
});