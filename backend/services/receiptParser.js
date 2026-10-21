// Pure functions: turns raw OCR text into receipt fields. Missing values stay null. Nothing is guessed.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const r2 = (n) => Math.round(n * 100) / 100;

// ---------- numbers ----------
const CURRENCY_STRIP = /₹|\$|€|£|\b(?:rs|inr)\b\.?|\b(?:rs|inr)(?=\d)/gi;
const DATE_LIKE = /\b\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;
const TIME_LIKE = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi;
// Digits plus letters OCR commonly confuses with digits (O->0, I/l->1, S->5, B->8).
const TOKEN = /(?<![A-Za-z])[\dOoIlSB][\dOoIlSB.,]*/g;

export function normalizeNumber(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.'); // 250,50
  else s = s.replace(/,/g, ''); // 1,234.56 / 1,00,000
  const n = Number(s);
  return Number.isFinite(n) ? r2(n) : null;
}

function amountsIn(text) {
  const cleaned = text.replace(CURRENCY_STRIP, ' ').replace(DATE_LIKE, ' ').replace(TIME_LIKE, ' ');
  const out = [];
  for (const m of cleaned.matchAll(TOKEN)) {
    const token = m[0].replace(/[.,]+$/, '');
    if (!/\d/.test(token)) continue;
    const n = normalizeNumber(token);
    if (n !== null && n > 0) out.push(n);
  }
  return out;
}

// ---------- total ----------
const STRONG = /grand\s*total|amount\s*(?:due|payable)|total\s*(?:amount|payable|due|bill)|net\s*(?:amount|payable|total)|balance\s*due|bill\s*amount|amt\s*payable|total\s*amt|invoice\s*total|\bpayable\b/i;
const WEAK = /\btotal\b/i;
const NOT_TOTAL = /sub\s*-?\s*total|total\s*(?:tax|gst|cgst|sgst|igst|vat|discount|disc|qty|quantity|items?|savings?|saved|points?)|tax\s*total|discount|saving|change/i;

function findTotal(lines) {
  const candidates = [];
  lines.forEach((line, i) => {
    if (NOT_TOTAL.test(line)) return;
    const strong = STRONG.exec(line);
    const weak = strong ? null : WEAK.exec(line);
    const hit = strong || weak;
    if (!hit) return;
    let values = amountsIn(line.slice(hit.index + hit[0].length));
    let nextLine = false;
    if (!values.length && lines[i + 1] && !STRONG.test(lines[i + 1]) && !WEAK.test(lines[i + 1])) {
      values = amountsIn(lines[i + 1]);
      nextLine = values.length > 0;
    }
    if (!values.length) return;
    const value = values[values.length - 1]; // the amount is normally the rightmost number
    if (value <= 0 || value > 1e7) return;
    candidates.push({ value, priority: strong ? 1 : 2, nextLine, index: i });
  });
  if (!candidates.length) return null;
  const best = Math.min(...candidates.map((c) => c.priority));
  const pool = candidates.filter((c) => c.priority === best);
  const chosen = pool[pool.length - 1]; // the final total is normally near the bottom
  let confidence = best === 1 ? 0.9 : 0.8;
  if (new Set(pool.map((c) => c.value)).size > 1) confidence -= 0.15;
  if (chosen.nextLine) confidence -= 0.1;
  return { value: chosen.value, confidence, index: chosen.index };
}

// ---------- date ----------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DATE_LABEL = /date|\bdt\b|dated/i;

function makeDate(y, m, d) {
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (dt.getTime() > Date.now() + 86400000) return null; // receipts are never dated in the future
  return dt;
}

function findDate(lines) {
  const found = [];
  lines.forEach((line, i) => {
    const labelled = DATE_LABEL.test(line);
    const push = (dt, penalty = 0) => dt && found.push({ dt, labelled, penalty, index: i });
    let m;
    if ((m = /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(line))) push(makeDate(+m[1], +m[2], +m[3]));
    if ((m = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(line))) {
      const ambiguous = +m[1] <= 12 && +m[2] <= 12 && +m[1] !== +m[2]; // day-first is assumed
      push(makeDate(+m[3], +m[2], +m[1]), (ambiguous ? 0.15 : 0) + (m[3].length === 2 ? 0.05 : 0));
    }
    if ((m = /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})[\s,.-]+(\d{2,4})\b/.exec(line)) && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
      push(makeDate(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]));
    }
    if ((m = /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/.exec(line)) && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
      push(makeDate(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]));
    }
  });
  if (!found.length) return null;
  const pick = found.find((f) => f.labelled) || found[0];
  const confidence = clamp((pick.labelled ? 0.85 : 0.65) - pick.penalty, 0.2, 0.95);
  return { iso: pick.dt.toISOString().slice(0, 10), confidence };
}

// ---------- merchant ----------
const NOT_MERCHANT = /\b(?:invoice|receipt|gstin|gst|phone|ph|tel|mob|mobile|cashier|table|order|token|welcome|thank|customer|date|time|bill|tax)\b|www\.|https?:|@/i;

function toTitleCase(s) {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s;
}

function findMerchant(lines) {
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const cleaned = lines[i].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.)&]+$/g, '').replace(/\s+/g, ' ');
    const letters = (cleaned.match(/[A-Za-z]/g) || []).length;
    const digits = (cleaned.match(/\d/g) || []).length;
    if (letters < 3 || digits > letters || NOT_MERCHANT.test(cleaned)) continue;
    return { name: toTitleCase(cleaned), confidence: i < 2 ? 0.7 : 0.5, index: i };
  }
  return null;
}

// ---------- currency ----------
function findCurrency(text) {
  if (/₹|\brs\b\.?|\binr\b|\brs(?=\d)/i.test(text)) return 'INR';
  if (/\$/.test(text)) return 'USD';
  if (/€/.test(text)) return 'EUR';
  if (/£/.test(text)) return 'GBP';
  return null;
}

// ---------- category ----------
const RULES = {
  Food: ['restaurant', 'cafe', 'café', 'dine', 'dining', 'biryani', 'pizza', 'burger', 'meals', 'thali', 'dosa', 'idli', 'bakery', 'kitchen', 'canteen', 'tiffin', 'snack', 'coffee', 'tea', 'juice', 'swiggy', 'zomato', 'dominos', 'kfc', 'mcdonald', 'starbucks', 'sweets', 'ice cream', 'chicken', 'paneer', 'naan', 'roti', 'sandwich'],
  Groceries: ['grocery', 'groceries', 'supermarket', 'mart', 'kirana', 'vegetable', 'veggies', 'fruits', 'milk', 'provision', 'dmart', 'bigbasket', 'reliance fresh', 'spencer', 'atta'],
  Transport: ['petrol', 'diesel', 'fuel', 'gasoline', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'shell', 'uber', 'rapido', 'metro', 'toll', 'parking', 'taxi'],
  Medical: ['pharmacy', 'pharma', 'medical', 'medicine', 'chemist', 'hospital', 'clinic', 'diagnostic', 'apollo', 'medplus', 'doctor', 'tablet', 'syrup', 'laboratory', 'pathology'],
  Shopping: ['clothing', 'apparel', 'garments', 'fashion', 'shoes', 'footwear', 'lifestyle', 'mall', 'boutique', 'textiles', 'jewel', 'electronics', 'amazon', 'flipkart', 'myntra', 'pantaloons', 'westside'],
  Electricity: ['electricity', 'kwh', 'units consumed', 'discom', 'tneb', 'tangedco', 'bescom', 'mseb', 'energy charges', 'meter reading'],
  'Mobile Recharge': ['recharge', 'airtel', 'jio', 'vodafone', 'bsnl', 'prepaid', 'postpaid', 'data pack'],
  Education: ['school', 'college', 'university', 'tuition', 'stationery', 'bookstore', 'books', 'coaching', 'exam fee'],
  Entertainment: ['cinema', 'movie', 'theatre', 'theater', 'pvr', 'inox', 'bookmyshow', 'gaming', 'netflix', 'concert'],
  Travel: ['flight', 'airlines', 'airways', 'irctc', 'railway', 'train ticket', 'bus ticket', 'redbus', 'makemytrip', 'goibibo', 'resort', 'lodge'],
  Rent: ['rent receipt', 'house rent', 'rent for', 'landlord', 'lease'],
};
const LABELS = {
  Food: 'Restaurant Bill', Groceries: 'Grocery Bill', Transport: 'Fuel / Transport Bill', Medical: 'Medical Bill',
  Shopping: 'Shopping Bill', Electricity: 'Electricity Bill', 'Mobile Recharge': 'Mobile Recharge', Education: 'Education Bill',
  Entertainment: 'Entertainment Bill', Travel: 'Travel Bill', Rent: 'Rent Receipt',
};
const RULE_REGEX = Object.fromEntries(
  Object.entries(RULES).map(([cat, kws]) => [cat, kws.map((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))])
);

function classify(text, merchantLine) {
  let best = null;
  for (const [cat, regexes] of Object.entries(RULE_REGEX)) {
    let score = 0;
    for (const rx of regexes) {
      if (rx.test(text)) score += 1;
      if (merchantLine && rx.test(merchantLine)) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { category: cat, score };
  }
  return best && { category: best.category, confidence: clamp(0.45 + 0.15 * best.score, 0.5, 0.9) };
}

// ---------- items ----------
const ITEM_LINE = /^(.{2,40}?)\s+(?:rs\.?|₹)?\s*(\d{1,6}(?:[.,]\d{1,2})?)$/i;

function findItems(lines, from, to) {
  const items = [];
  for (let i = from; i < to && items.length < 30; i++) {
    const line = lines[i];
    if (NOT_TOTAL.test(line) || STRONG.test(line) || WEAK.test(line) || DATE_LIKE.test(line)) { DATE_LIKE.lastIndex = 0; continue; }
    DATE_LIKE.lastIndex = 0;
    const m = ITEM_LINE.exec(line);
    if (!m) continue;
    const name = m[1].replace(/\s+\d+\s*[x×]?\s*$/i, '').trim();
    const price = normalizeNumber(m[2]);
    if ((name.match(/[A-Za-z]/g) || []).length >= 2 && price) items.push({ name, price });
  }
  return items;
}

// ---------- main ----------
export function parseReceipt(text, ocrConfidence = 80) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ocrFactor = clamp(ocrConfidence / 100 + 0.1, 0.5, 1);
  const scale = (c) => r2(clamp(c * ocrFactor, 0, 1));

  const merchant = findMerchant(lines);
  const total = findTotal(lines);
  const date = findDate(lines);
  const category = classify(text, merchant ? lines[merchant.index] : '');
  const label = category ? LABELS[category.category] : null;

  const fields = {
    merchant: merchant?.name ?? null,
    description: label ? (merchant ? `${label} - ${merchant.name}` : label) : merchant?.name ?? null,
    amount: total?.value ?? null,
    date: date?.iso ?? null,
    category: category?.category ?? null,
    currency: findCurrency(text),
    items: findItems(lines, merchant ? merchant.index + 1 : 0, total ? total.index : lines.length),
  };

  const confidence = {};
  if (total) confidence.amount = scale(total.confidence);
  if (date) confidence.date = scale(date.confidence);
  if (category) confidence.category = scale(category.confidence);
  if (merchant) confidence.merchant = scale(merchant.confidence);

  return { fields, confidence };
}
