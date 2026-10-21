import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNumber, parseReceipt } from '../services/receiptParser.js';

const restaurant = `SPICE GARDEN RESTAURANT
12, MG Road, Chennai
GSTIN: 33ABCDE1234F1Z5
Date: 14/10/2026   Time: 20:41
Veg Biryani 1 x 180.00
Butter Naan 2 x 35.00
Sub Total 250.00
CGST 2.5% 6.25
SGST 2.5% 6.25
Grand Total Rs. 262.50
Thank you, visit again`;

test('restaurant bill: uses Grand Total, not the largest or first number', () => {
  const { fields, confidence } = parseReceipt(restaurant, 90);
  assert.equal(fields.amount, 262.5);
  assert.equal(fields.date, '2026-10-14');
  assert.equal(fields.category, 'Food');
  assert.equal(fields.merchant, 'Spice Garden Restaurant');
  assert.equal(fields.currency, 'INR');
  assert.ok(confidence.amount >= 0.8);
  assert.ok(fields.items.some((i) => i.name.startsWith('Veg Biryani')));
});

test('grocery bill: plain TOTAL line ignores sub total, tax and cash tendered', () => {
  const text = `D MART SUPERMARKET
Bill Date 03-10-2026
Milk 1L 62.00
Vegetables 148.50
Sub Total 210.50
Discount 10.50
TOTAL 200.00
Cash 500.00
Change 300.00`;
  const { fields } = parseReceipt(text);
  assert.equal(fields.amount, 200);
  assert.equal(fields.category, 'Groceries');
  assert.equal(fields.date, '2026-10-03');
});

test('total on the following line is found, with lower confidence', () => {
  const same = parseReceipt('Cafe Aroma\nTotal 120.00\n01/10/2026', 90);
  const next = parseReceipt('Cafe Aroma\nTotal\n120.00\n01/10/2026', 90);
  assert.equal(next.fields.amount, 120);
  assert.ok(next.confidence.amount < same.confidence.amount);
});

test('OCR letter/digit confusion is repaired inside numbers', () => {
  const { fields } = parseReceipt('Quick Mart\nTOTAL Rs 2S0.00\n05/10/2026');
  assert.equal(fields.amount, 250);
});

test('no total label: amount stays null instead of guessing the largest number', () => {
  const { fields, confidence } = parseReceipt('Some Shop\nItem A 40.00\nItem B 900.00\n12/10/2026');
  assert.equal(fields.amount, null);
  assert.equal(confidence.amount, undefined);
});

test('missing or impossible date stays null', () => {
  assert.equal(parseReceipt('Shop\nTOTAL 50.00').fields.date, null);
  assert.equal(parseReceipt('Shop\nDate 31/02/2026\nTOTAL 50.00').fields.date, null);
  assert.equal(parseReceipt('Shop\nDate 01/01/2099\nTOTAL 50.00').fields.date, null);
});

test('date formats: month names, ISO, labelled date preferred', () => {
  assert.equal(parseReceipt('Shop\n5 Oct 2026\nTOTAL 10').fields.date, '2026-10-05');
  assert.equal(parseReceipt('Shop\nOct 5, 2026\nTOTAL 10').fields.date, '2026-10-05');
  assert.equal(parseReceipt('Shop\n2026-10-05\nTOTAL 10').fields.date, '2026-10-05');
  assert.equal(parseReceipt('Shop\nOrder 01/09/2026\nBill date: 07/09/2026\nTOTAL 10').fields.date, '2026-09-07');
});

test('fuel and pharmacy receipts are classified', () => {
  assert.equal(parseReceipt('INDIAN OIL PETROL PUMP\nPetrol 5.2 L\nTOTAL 540.00').fields.category, 'Transport');
  assert.equal(parseReceipt('Apollo Pharmacy\nTablets\nTOTAL 85.00').fields.category, 'Medical');
});

test('unknown merchant leaves category empty', () => {
  assert.equal(parseReceipt('Zxqv Traders\nTOTAL 85.00').fields.category, null);
});

test('number formats', () => {
  assert.equal(normalizeNumber('1,234.56'), 1234.56);
  assert.equal(normalizeNumber('1.234,56'), 1234.56);
  assert.equal(normalizeNumber('1,00,000'), 100000);
  assert.equal(normalizeNumber('250,50'), 250.5);
  assert.equal(normalizeNumber('abc'), null);
});

test('empty text returns all-null fields', () => {
  const { fields } = parseReceipt('');
  assert.equal(fields.amount, null);
  assert.equal(fields.date, null);
  assert.equal(fields.merchant, null);
});
