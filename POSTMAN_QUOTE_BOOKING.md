# Postman — quotation and booking

Test how a customer posts a job, a tradesman spends wallet tokens to open job details, sends a quote, and the customer books (hires) that quote.

Local: `http://localhost:3000`  
Live: `https://api.tradersinloop.co.uk`

---

## What happens

1. **Customer** posts a job.
2. **Tradesman** buys a token package (Stripe) or gets tokens from admin.
3. Tradesman opens **job details**. Wallet tokens are deducted once (`leadPrice` from the job budget range).
4. Tradesman sends a quote. No extra Stripe charge. Status is `SUBMITTED`.
5. **Customer** hires the quote → a **booking** is created.

The customer does **not** pay the platform to hire. Stripe is only for buying token packages.

| Job budget | Tokens deducted on first view |
|---|---|
| £0 – £100 | 10 |
| £100 – £250 | 15 |
| £250 – £500 | 20 |
| £500 – £1,000 | 30 |
| £1,000 – £4,000 | 40 |
| £4,000+ | 50 |

Exact boundary (e.g. £100) uses the higher range. Admin can change `tokenCost`.

Quote status: `SUBMITTED` → `ACCEPTED` (after hire). Other quotes on the same job become `REJECTED`.

---

## Postman variables

| Variable | Save from |
|---|---|
| `baseUrl` | `http://localhost:3000` or live API |
| `userToken` | customer login |
| `tradesmanToken` | tradesman login |
| `categoryId` | GET categories |
| `jobId` | POST job |
| `quoteId` | POST quote (`data.id`) |
| `bookingId` | hire (`data.id`) |

Authorization: **Bearer Token**.  
JSON: Body → **raw → JSON**.  
Job/quote with files: Body → **form-data**.

---

## 1. Login

```
POST {{baseUrl}}/api/auth/login
```

Customer:

```json
{
  "email": "sarah.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `userToken`

Tradesman:

```json
{
  "email": "daniel.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `tradesmanToken`

Register first if these emails do not exist (`role`: `USER` or `TRADESMAN`).

---

## 2. See quote prices (optional)

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/token-rules
```

Use `tokenCost` and `price` on the quote form before pay.

---

## 3. Customer posts a job

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/categories
```

Save a category `id` → `categoryId`

```
POST {{baseUrl}}/api/jobs
```

```json
{
  "title": "Bathroom leak repair",
  "description": "Fix leaking shower and replace sealant",
  "categoryId": "{{categoryId}}",
  "location": "Kensington, London",
  "city": "London",
  "budgetMin": 1500,
  "budgetMax": 2500,
  "urgency": "HIGH"
}
```

Save `data.id` → `jobId`

---

## 4. Tradesman opens the job

Bearer: `{{tradesmanToken}}`

Job list (no auth):

```
GET {{baseUrl}}/api/jobs?page=1&limit=10
```

Job details (login required):

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

Without a token this returns **401**.

First open deducts `leadPrice` tokens (job budget £1500–£2500 → £1,000–£4,000 → 40 tokens). Check `data.tokensCharged` and `data.tokenBalance`. Open again: `tokensCharged` is `0`.

Not enough tokens → 400 `Not enough tokens to view this job`.

---

## 5. Tradesman creates a quote

Bearer: `{{tradesmanToken}}`

```
POST {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

```json
{
  "amount": 2100,
  "estimatedDuration": "3 days",
  "startDate": "2026-11-01",
  "materialsIncluded": false,
  "warranty": "12-month labour",
  "proposal": "I can repair the leak and reseal the shower."
}
```

Save `data.id` → `quoteId`. Status is `SUBMITTED` immediately. No Stripe checkout.

Form-data also works (same keys; images as File).

---

## 6. Tradesman checks the quote

```
GET {{baseUrl}}/api/quotes/mine?page=1&limit=10
```

```
GET {{baseUrl}}/api/quotes/{{quoteId}}
```

Bearer: `{{tradesmanToken}}`

`status` should be `SUBMITTED`.

Withdraw (if you do not want hire on this quote):

```
PATCH {{baseUrl}}/api/quotes/{{quoteId}}/withdraw
```

Withdrawn quotes stay unpaid/unrefunded. Customer list hides `WITHDRAWN`.

---

## 7. Customer books the quote (hire)

Bearer: `{{userToken}}`

See quotes on the job:

```
GET {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

Hire / book:

```
POST {{baseUrl}}/api/quotes/{{quoteId}}/hire
```

Save `data.id` → `bookingId`

This:

- creates the booking
- sets job to `ACCEPTED`
- sets this quote to `ACCEPTED`
- rejects other submitted quotes on the same job

Only the job owner can hire. Quote must be `SUBMITTED`.

---

## 8. Confirm the booking

Customer:

```
GET {{baseUrl}}/api/bookings
```

```
GET {{baseUrl}}/api/bookings/{{bookingId}}
```

Bearer: `{{userToken}}`

Tradesman assigned jobs:

```
GET {{baseUrl}}/api/tradesman/jobs
```

Bearer: `{{tradesmanToken}}`

Optional job progress:

```
PATCH {{baseUrl}}/api/tradesman/jobs/{{jobId}}/status
```

```json
{ "status": "IN_PROGRESS" }
```

```json
{ "status": "COMPLETED" }
```

---

## Order in Postman

1. Login customer + tradesman  
2. GET categories → POST job  
3. Tradesman GET job details (tokens deduct)  
4. POST quote (`SUBMITTED`)  
5. GET quotes/mine  
6. Customer GET job quotes → POST hire  
7. GET bookings / tradesman jobs  

---

## Errors

| Result | Meaning |
|---|---|
| 401 on job details | Not logged in |
| 400 `Not enough tokens to view this job` | Wallet is below this job's `leadPrice` |
| 409 already sent a quote | This tradesman already quoted this job |
| 400 hire | Quote is not `SUBMITTED`, or job is not `OPEN` |
| 403 hire | Not the job owner |
