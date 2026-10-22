# Postman — quotation and booking

Test how a customer posts a job, a tradesman pays Stripe to send a quote, and the customer books (hires) that quote.

Local: `http://localhost:3000`  
Live: `https://api.tradersinloop.co.uk`

---

## What happens

1. **Customer** posts a job.
2. **Tradesman** writes a quote and clicks buy/pay.
3. API sends them to **Stripe**. Charge = admin `price` for that quotation amount range. `tokenCost` is stored on the quote.
4. After pay, quote status becomes `SUBMITTED`. The customer can see it.
5. **Customer** hires the quote → a **booking** is created.

The customer does **not** pay the platform to hire. Stripe is for the tradesman’s quote lead fee only.

| Quote `amount` | Tokens | Stripe charge |
|---|---|---|
| £0 – £100 | 10 | £10 |
| £100 – £250 | 15 | £15 |
| £250 – £500 | 20 | £20 |
| £500 – £1,000 | 30 | £30 |
| £1,000 – £4,000 | 40 | £40 |
| £4,000+ | 50 | £50 |

Exact boundary (e.g. £100) uses the higher range. Admin can change `tokenCost` and `price`.

Quote status: `PENDING_PAYMENT` → `SUBMITTED` → `ACCEPTED` (after hire). Other quotes on the same job become `REJECTED`.

---

## Postman variables

| Variable | Save from |
|---|---|
| `baseUrl` | `http://localhost:3000` or live API |
| `userToken` | customer login |
| `tradesmanToken` | tradesman login |
| `categoryId` | GET categories |
| `jobId` | POST job |
| `quoteId` | POST quote (`data.quoteId`) |
| `sessionId` | POST quote (`data.sessionId`) |
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

---

## 5. Tradesman creates a quote → Stripe pay

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

£2100 is in **£1,000 – £4,000** → default Stripe **£40**, **40 tokens**.

Save:

- `data.quoteId` → `quoteId`
- `data.sessionId` → `sessionId`
- `data.checkoutUrl` — open in the browser and pay

Quote is `PENDING_PAYMENT` until Stripe is paid. The customer cannot see it yet.

Form-data also works (same keys; images as File).

---

## 6. Confirm payment

After Stripe pay, success URL is:

```
GET {{baseUrl}}/api/quotes/stripe/success?session_id={{sessionId}}
```

That marks the quote `SUBMITTED` and redirects to the frontend.

Optional (if you did not follow the redirect):

```
POST {{baseUrl}}/api/quotes/confirm
```

Bearer: `{{tradesmanToken}}`

```json
{
  "sessionId": "{{sessionId}}"
}
```

Safe to call twice.

---

## 7. Tradesman checks the quote

```
GET {{baseUrl}}/api/quotes/mine?page=1&limit=10
```

```
GET {{baseUrl}}/api/quotes/{{quoteId}}
```

Bearer: `{{tradesmanToken}}`

`status` should be `SUBMITTED`.  
`tokensCharged` and `amountPaid` should match the range.

Withdraw (if you do not want hire on this quote):

```
PATCH {{baseUrl}}/api/quotes/{{quoteId}}/withdraw
```

Withdrawn quotes stay unpaid/unrefunded. Customer list hides `WITHDRAWN`.

---

## 8. Customer books the quote (hire)

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

## 9. Confirm the booking

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
3. GET token-rules (see price for £2100)  
4. POST quote → open `checkoutUrl` → pay  
5. GET quotes/mine (`SUBMITTED`)  
6. Customer GET job quotes → POST hire  
7. GET bookings / tradesman jobs  

---

## Errors

| Result | Meaning |
|---|---|
| 401 on job details | Not logged in |
| 400 `No token rule matches` | Quote amount has no active range |
| 400 `Admin has not set a Stripe price` | Range `price` is 0 |
| 409 already sent a quote | This tradesman already quoted this job (unless still `PENDING_PAYMENT`) |
| 400 hire | Quote is not `SUBMITTED`, or job is not `OPEN` |
| 403 hire | Not the job owner |
