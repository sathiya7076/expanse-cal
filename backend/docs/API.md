# API reference and sample requests

Base URL: `http://localhost:5000/api`. Every route except register, login and health needs `Authorization: Bearer <token>`.
Errors are always `{ "message": "..." }` (validation errors also include `errors: [{ field, msg }]`).

```bash
BASE=http://localhost:5000/api
```

## Auth

```bash
curl -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Asha Kumar","email":"asha@example.com","password":"correct-horse-9"}'

curl -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"correct-horse-9"}'
# -> { "token": "...", "user": { "_id", "name", "email", "createdAt" } }

TOKEN=paste-the-token-here
curl $BASE/auth/me -H "Authorization: Bearer $TOKEN"
```

## Salary

```bash
curl -X POST $BASE/salary -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"employeeName":"Asha Kumar","companyName":"Acme Pvt Ltd","amount":25000,"paymentFrequency":"Monthly","paymentDate":"2026-10-01","notes":"Net pay"}'

curl $BASE/salary -H "Authorization: Bearer $TOKEN"        # { "salaries": [...] }
```

Record a payment (an income transaction). The same pay period cannot be recorded twice (`409`):

```bash
curl -X POST $BASE/transactions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"income","category":"Salary","description":"Salary from Acme Pvt Ltd","amount":25000,"date":"2026-10-01","salaryId":"<salary _id>"}'
```

## Transactions

```bash
curl -X POST $BASE/transactions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"expense","category":"Food","description":"Lunch","amount":250,"date":"2026-10-14","paymentMethod":"UPI","notes":""}'

curl -X POST $BASE/transactions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"income","category":"Freelancing","description":"Logo design","amount":2000,"date":"2026-10-10"}'

# search, filter, sort (all optional)
curl "$BASE/transactions?type=expense&q=lunch&category=Food&from=2026-10-01&to=2026-10-31&sort=amount&order=desc" \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT $BASE/transactions/<id> -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Food","description":"Team lunch","amount":300,"date":"2026-10-14"}'

curl -X DELETE $BASE/transactions/<id> -H "Authorization: Bearer $TOKEN"
```

Expense categories: Food, Groceries, Transport, Rent, Electricity, Mobile Recharge, Medical, Education, Shopping, Entertainment, Travel, Other.
Income categories: Freelancing, Business, Investments, Part-time jobs, Bonuses, Other income, Salary.

## Receipt scanner

```bash
curl -X POST $BASE/receipts/scan -H "Authorization: Bearer $TOKEN" -F "receipt=@/path/to/bill.jpg"
```

Response (fields the scan cannot find are `null`; nothing is saved yet):

```json
{
  "extractedText": "SPICE GARDEN ...",
  "fields": { "merchant": "Spice Garden", "description": "Restaurant Bill - Spice Garden", "amount": 250,
              "date": "2026-10-14", "category": "Food", "currency": "INR", "items": [{ "name": "Veg Biryani", "price": 180 }] },
  "confidence": { "amount": 0.9, "date": 0.8, "category": 0.75, "merchant": 0.7 },
  "receiptImage": "uploads/<userId>-<random>.jpg",
  "receiptHash": "sha256...",
  "duplicate": { "isDuplicate": false, "reason": null, "message": "" }
}
```

After the user reviews and edits:

```bash
curl -X POST $BASE/receipts/confirm -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Food","description":"Restaurant Bill - Spice Garden","amount":250,"date":"2026-10-14","paymentMethod":"UPI","notes":"","receiptImage":"uploads/<file from scan>"}'
# 201 -> saved transaction (source: "receipt"); 409 if this receipt image was already saved
```

## Budgets

```bash
curl -X POST $BASE/budgets -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category":"Food","amount":3000,"month":10,"year":2026}'

curl "$BASE/budgets?month=10&year=2026" -H "Authorization: Bearer $TOKEN"
# { "budgets": [{ "category":"Food","amount":3000,"spent":2500,"remaining":500, ... }] }
```

## Savings goals

```bash
curl -X POST $BASE/savings-goals -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Emergency fund","targetAmount":100000,"currentAmount":10000,"targetDate":"2027-06-30"}'

curl -X PUT $BASE/savings-goals/<id> -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"currentAmount":15000}'
```

## Dashboard and reports

```bash
curl "$BASE/dashboard/summary?month=10&year=2026" -H "Authorization: Bearer $TOKEN"
curl "$BASE/reports/monthly?month=10&year=2026"   -H "Authorization: Bearer $TOKEN"   # summary, daily[], weekly[]
curl "$BASE/reports/yearly?year=2026"             -H "Authorization: Bearer $TOKEN"   # months[12]
curl "$BASE/reports/categories?month=10&year=2026" -H "Authorization: Bearer $TOKEN"  # { categories: [...] }
```

Dashboard rules: `totalIncome = monthlySalary + additionalIncome` (salary payments are income transactions, so it is never counted twice),
`remainingBalance = totalIncome - totalExpenses`, and `totalSavings` is the sum of savings goals' saved amounts (the remaining balance is never treated as savings).

## Status codes

`400` validation, `401` not logged in, `404` not found (also returned for other users' records), `409` duplicate (salary period, receipt, budget, email),
`413` image over 5 MB, `422` receipt unreadable, `429` rate limited.
