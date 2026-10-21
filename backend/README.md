# SmartSpend: Backend

Node.js + Express + MongoDB (Mongoose) API for the Smart Salary, Income & Expense Tracker. JavaScript (ES modules) throughout.

## Run locally

Needs Node 20+ and a MongoDB database (local, or a free Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env      # then set MONGODB_URI and JWT_SECRET
npm run dev               # http://localhost:5000  (npm start for production)
```

Generate a strong secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Then start the frontend (`cd ../frontend && npm run dev`). It proxies `/api` to port 5000.

Run the receipt-parser tests (no database or network needed): `npm test`

### Receipt scanning notes

- Tesseract.js downloads its English language data the first time a receipt is scanned (internet needed once), then caches it in `.tesseract-cache/`.
- OCR is only as good as the photo. Flat, well-lit, in-focus images read best.
- Parsing is rule-based (`services/receiptParser.js`). The total is taken from labels such as GRAND TOTAL, AMOUNT DUE, TOTAL; subtotal, tax, discount and change lines are ignored, and a receipt with no total label gets a blank amount rather than a guess. Dates are read day-first (14/10/2026), which suits Indian receipts. Unknown fields come back `null` with no confidence value.
- Electricity bills map to the `Electricity` category, since that is the category in your list.

## Structure

```
backend/
  config/       env validation, MongoDB connection, constants
  models/       User, Salary, Transaction, Budget, SavingsGoal
  controllers/  one per API area
  routes/       one per API area, mounted in routes/index.js
  services/     receiptParser, ocrService, receiptService, summaryService, salaryPeriod, categories
  middleware/   auth (JWT), validators + validate, upload (Multer), rate limiters, errorHandler
  utils/        AppError, asyncHandler, dates, files, cleanup
  uploads/      receipt images (not served publicly, git-ignored)
  tests/        receipt parser tests
  docs/API.md   every endpoint with sample requests
  app.js  server.js  .env.example
```

## Security measures in place

- Passwords hashed with bcrypt (12 rounds); login responds the same for unknown email and wrong password.
- JWT auth on every private route; the user id always comes from the token, never the request body, and every query is filtered by it. Other users' records return 404.
- express-validator on all input; string-only checks stop NoSQL operator injection; search text is regex-escaped.
- Uploads: JPG/PNG/WebP only, 5 MB limit, MIME type plus magic-byte check, random server-generated file names, files kept outside any static route. The receipt hash is recomputed server-side at confirm time.
- Duplicate protection: unique indexes on receipt hash per user and on salary payment per pay period; the scanner also warns about same-amount-same-day expenses.
- Rate limiting on the whole API, with stricter limits on login/register and receipt uploads. Helmet headers, CORS limited to `CLIENT_URL`, 100 KB JSON body limit.
- Scanned images that are never confirmed are deleted after 24 hours.

## Limits to know about

- Amounts are stored as numbers rounded to 2 decimals; for a production ledger, consider integer paise.
- Transaction lists return up to 1,000 rows (the frontend has no pagination yet).
- JWTs are not revocable before they expire (default 7 days).
- Running behind a proxy or load balancer? Add `app.set('trust proxy', 1)` in `app.js` so rate limiting sees real client IPs.
- This code was syntax-checked and its parser unit-tested, but not run against a live MongoDB. Do a first smoke test with the curl samples in `docs/API.md`.
