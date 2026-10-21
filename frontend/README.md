# SmartSpend: Frontend

React + Vite + **Tailwind CSS v4** front end for the Smart Salary, Income & Expense Tracker (MERN).
Bootstrap 5 from the original spec is replaced by Tailwind. Everything else (React Router, Axios, Recharts, React Icons) is unchanged.

## Run locally

```bash
cd frontend
npm install
cp .env.example .env      # optional; defaults work with the dev proxy
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so start the Express backend there first (no CORS setup needed in development).

## Build for production

```bash
npm run build             # outputs dist/
npm run preview           # serve dist/ locally to verify
```

Deploy `dist/` to any static host and add an SPA fallback (rewrite all paths to `index.html`).
If the API lives on another origin, set `VITE_API_URL=https://api.example.com/api` before building and allow that origin via `CLIENT_URL` on the backend.

## Structure

```
src/
  components/ui/            Button, Card, Field (Input/Select/Textarea), Modal + ConfirmDialog,
                            Spinner, EmptyState, ErrorMessage, ProgressBar, PageHeader, PeriodFilter
  components/layout/        ProtectedRoute
  components/dashboard/     StatCard, Charts (Recharts)
  components/transactions/  TransactionsPage (shared by Income + Expenses), TransactionForm
  components/receipts/      Dropzone, ConfidenceBadge
  layouts/                  AppLayout (sidebar + mobile drawer), AuthLayout
  pages/                    Login, Register, Dashboard, Salary, Income, Expenses, ScanReceipt,
                            Budgets, SavingsGoals, Reports, Profile, NotFound
  services/                 Axios instance + one module per API area
  context/ hooks/ utils/    Auth + toast context, useFetch/useDebounce, formatters and constants
```

State: React Context for auth and toasts, a small `useFetch` hook for server data, URL search params for list filters, and a reducer for the receipt-scan flow.

## API contract the frontend expects

Responses may be bare arrays or wrapped (`{ transactions: [...] }`, `{ data: [...] }`); both work.

| Endpoint | Request | Response |
|---|---|---|
| `POST /auth/register` | `{ name, email, password }` | `{ token, user: { name, email, createdAt } }` |
| `POST /auth/login` | `{ email, password }` | `{ token, user }` |
| `GET /auth/me` | | `{ user }` or the user object |
| `GET /transactions` | query: `type, q, category, from, to, sort (date/amount), order (asc/desc)` | list of transactions (`_id, type, category, description, amount, date, paymentMethod, notes, source`) |
| `POST/PUT/DELETE /transactions` | transaction body | saved object |
| `GET /salary` + CRUD | `{ employeeName, companyName, amount, paymentFrequency, paymentDate, notes }` | list / object |
| `GET /budgets?month&year` | | list with `{ _id, category, amount, month, year, spent }` (`spent` calculated server-side) |
| `GET /savings-goals` + CRUD | `{ name, targetAmount, currentAmount, targetDate }` | list / object |
| `GET /dashboard/summary?month&year` | | see below |
| `GET /reports/monthly?year&month` | | `{ summary: { income, expenses, net }, daily: [{ date, income, expenses }], weekly: [{ label, income, expenses }] }` |
| `GET /reports/yearly?year` | | `{ months: [{ month (1-12), income, expenses }] }` |
| `GET /reports/categories?year&month` | | `[{ category, total }]` or `{ categories: [...] }` |
| `POST /receipts/scan` | multipart, field name **`receipt`** | see below |
| `POST /receipts/confirm` | `{ category, description, amount, date, paymentMethod, notes, receiptImage, receiptHash, type: 'expense', source: 'receipt' }` | saved transaction (return `409` for duplicates) |

Dashboard summary:

```json
{
  "monthlySalary": 25000, "additionalIncome": 2000, "totalIncome": 27000,
  "totalExpenses": 8500, "remainingBalance": 18500, "totalSavings": 0,
  "highestCategory": { "category": "Food", "total": 3200 },
  "categoryBreakdown": [{ "category": "Food", "total": 3200 }],
  "monthlySpending": [{ "month": 1, "total": 7200 }],
  "recentTransactions": []
}
```

Receipt scan response (fields the scan could not find should be omitted or null; the UI marks them "Not found" and never invents values):

```json
{
  "extractedText": "raw OCR text",
  "fields": { "merchant": "Spice Garden", "description": "Restaurant Bill", "amount": 250, "date": "2026-10-14", "category": "Food", "currency": "INR", "items": [] },
  "confidence": { "amount": 0.92, "date": 0.7, "category": 0.85, "merchant": 0.8 },
  "receiptImage": "uploads/abc123.jpg",
  "receiptHash": "sha256...",
  "duplicate": { "isDuplicate": false, "message": "" }
}
```

Auth: the token is stored in `localStorage` and sent as `Authorization: Bearer <token>`; a `401` clears it and returns the user to `/login`.

## Notes

- Reports: CSV is generated in the browser; PDF uses the browser's print dialog ("Save as PDF"), with navigation hidden by print styles.
- The manual expense form has no image field. Receipt images are attached through Scan Receipt.
- Accessibility: skip link, labelled fields with linked errors, native `<dialog>` modals, `aria-live` toasts, progress bars with ARIA values, text alternatives for charts, `prefers-reduced-motion` respected.
- Not yet covered: automated tests, dark mode.
