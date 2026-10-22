# Postman flow — book a service, buy tokens, admin token prices

Use this file to test the three main product flows:

1. Customer books a service (post job → quote → hire)
2. Tradesman buys tokens (Stripe)
3. Admin sets token price per quotation range

Local: `http://localhost:3000`  
Live: `https://api.tradersinloop.co.uk`

---

## Postman setup

Collection variables:

| Variable | After which request |
|---|---|
| `baseUrl` | set once (`http://localhost:3000` or live API) |
| `userToken` | user login |
| `tradesmanToken` | tradesman login |
| `adminToken` | admin login |
| `userId` | user login |
| `tradesmanId` | tradesman login |
| `categoryId` | GET categories |
| `jobId` | POST job |
| `quoteId` | POST quote |
| `bookingId` | hire quote |
| `packageId` | GET packages |
| `tokenRuleId` | GET admin token-rules |

Every protected request:

- Authorization → **Bearer Token**
- Token: `{{userToken}}` / `{{tradesmanToken}}` / `{{adminToken}}`

JSON requests: Body → **raw → JSON**.  
Job and quote with images: Body → **form-data**.

---

## How the money / tokens work

- The **customer does not pay** the platform to post a job or hire.
- The **tradesman pays Stripe when they submit a quote**. The card amount is the admin `price` for that quotation range. `tokenCost` is recorded on the quote.
- Tradesmen can still **buy token packs** for the wallet; quoting no longer deducts wallet tokens.
- Admin changes `tokenCost` and `price` on each range.

Default ranges:

| Quotation amount | Tokens | Stripe price |
|---|---|---|
| £0 – £100 | 10 | £10 |
| £100 – £250 | 15 | £15 |
| £250 – £500 | 20 | £20 |
| £500 – £1,000 | 30 | £30 |
| £1,000 – £4,000 | 40 | £40 |
| £4,000+ | 50 | £50 |

Exact boundary (e.g. £100) uses the **higher** range.

---

## A. Login (all three roles)

If accounts already exist, skip register and only login.

### 1. Register / login — Customer

```
POST {{baseUrl}}/api/auth/register
```

```json
{
  "fullName": "Sarah Morrison",
  "email": "sarah.flow@test.com",
  "phoneNumber": "+44 7911 234 567",
  "address": "Kensington, London",
  "password": "Password1",
  "role": "USER"
}
```

Or:

```
POST {{baseUrl}}/api/auth/login
```

```json
{
  "email": "sarah.flow@test.com",
  "password": "Password1",
  "rememberMe": true
}
```

Save `data.token` → `userToken`  
Save `data.user.id` → `userId`

### 2. Register / login — Tradesman

```json
{
  "fullName": "Daniel Hughes",
  "email": "daniel.flow@test.com",
  "phoneNumber": "+44 7700 900123",
  "address": "Manchester, UK",
  "password": "Password1",
  "role": "TRADESMAN"
}
```

New tradesmen start with **0 tokens**.  
Save `data.token` → `tradesmanToken`  
Save `data.user.id` → `tradesmanId`

### 3. Register / login — Admin

```json
{
  "fullName": "Atik Adnan",
  "email": "admin.flow@test.com",
  "phoneNumber": "+44 7700 111222",
  "address": "London, UK",
  "password": "AdminPass1",
  "role": "ADMIN"
}
```

Save `data.token` → `adminToken`

---

## B. Admin sets token prices

Bearer: `{{adminToken}}`

### 4. List ranges

```
GET {{baseUrl}}/api/admin/token-rules
```

Copy one `id` (for example `£1,000 – £4,000`) → `tokenRuleId`

### 5. Change token cost and Stripe price for that range

```
PUT {{baseUrl}}/api/admin/token-rules/{{tokenRuleId}}
```

```json
{
  "name": "£1,000 – £4,000",
  "minBudget": 1000,
  "maxBudget": 4000,
  "tokenCost": 45,
  "price": 45,
  "isActive": true
}
```

`tokenCost` = tokens recorded for the quote.  
`price` = **GBP charged on Stripe** when the tradesman pays to submit the quote.

### 6. Optional — add a range

```
POST {{baseUrl}}/api/admin/token-rules
```

```json
{
  "name": "£0 – £100",
  "minBudget": 0,
  "maxBudget": 100,
  "tokenCost": 10,
  "price": 10,
  "isActive": true
}
```

Overlapping active ranges return **400**. Adjacent boundaries (100 / 250) are allowed.

### 7. Tradesman can read the same prices

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/token-rules
```

Use this on the quote form. Only **active** rules are returned.

---

## C. Tradesman buys tokens (Stripe)

Bearer: `{{tradesmanToken}}` for checkout. List packages has no auth.

### 8. List packages

```
GET {{baseUrl}}/api/packages
```

Save a package `id` → `packageId`

### 9. Start checkout

```
POST {{baseUrl}}/api/packages/{{packageId}}/checkout
```

Open `data.checkoutUrl` in the browser and pay.

After pay, Stripe hits:

`{{baseUrl}}/api/packages/stripe/success?session_id=...`

Tokens are added, then redirect to the wallet page.

Optional confirm (safe to call twice):

```
POST {{baseUrl}}/api/packages/confirm
```

```json
{
  "sessionId": "cs_test_..."
}
```

### 10. Check wallet

```
GET {{baseUrl}}/api/tradesman/wallet
```

Expect `availableTokens` > 0 after a successful purchase.

### 11. Purchase history

```
GET {{baseUrl}}/api/tradesman/purchases?page=1&limit=10
```

Admin view of all buys:

```
GET {{baseUrl}}/api/admin/purchases?page=1&limit=10
```

**Skip Stripe for a local quote test:** admin can grant tokens instead:

```
PATCH {{baseUrl}}/api/admin/tradesmen/{{tradesmanId}}/tokens
```

Bearer: `{{adminToken}}`

```json
{
  "amount": 200
}
```

---

## D. Customer books a service

### 12. Get a category

No auth.

```
GET {{baseUrl}}/api/categories
```

Save a category `id` → `categoryId`

### 13. Customer posts a job

Bearer: `{{userToken}}`  
Body → **form-data**

```
POST {{baseUrl}}/api/jobs
```

| Key | Type | Value |
|---|---|---|
| title | Text | Bathroom leak repair |
| description | Text | Fix leaking shower and replace sealant |
| categoryId | Text | `{{categoryId}}` |
| location | Text | Kensington, London |
| city | Text | London |
| budgetMin | Text | 1500 |
| budgetMax | Text | 2500 |
| urgency | Text | HIGH |

Save `data.id` → `jobId`

JSON also works if you do not upload files:

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

### 14. Tradesman browses jobs

No auth for the list. Job **details** need login.

```
GET {{baseUrl}}/api/jobs?page=1&limit=10
```

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

Bearer: `{{tradesmanToken}}` (401 without a token)

### 15. Tradesman pays on Stripe to submit a quote

Bearer: `{{tradesmanToken}}`  
Body → **form-data** or JSON

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

£2100 matches **£1,000 – £4,000**. Stripe charge is that range’s `price` (e.g. £45). `tokensCharged` is the range’s `tokenCost`.

Response:

- `data.checkoutUrl` — open this in the browser and pay
- `data.sessionId`
- `data.quoteId` → save as `quoteId`
- `data.amountPaid` / `data.tokensCharged`

After pay, Stripe hits `GET /api/quotes/stripe/success?session_id=...` and the quote becomes `SUBMITTED`.

Optional confirm:

```
POST {{baseUrl}}/api/quotes/confirm
```

```json
{
  "sessionId": "cs_test_..."
}
```

Until payment succeeds, the customer does **not** see the quote.

### 16. Customer sees quotes and hires (books the service)

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

```
POST {{baseUrl}}/api/quotes/{{quoteId}}/hire
```

This creates the booking. Save `data.id` → `bookingId` (or `data.booking.id` if nested).

### 17. Confirm the booking

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/bookings
```

```
GET {{baseUrl}}/api/bookings/{{bookingId}}
```

Tradesman assigned jobs:

```
GET {{baseUrl}}/api/tradesman/jobs
```

Bearer: `{{tradesmanToken}}`

### 18. Optional — complete the job

```
PATCH {{baseUrl}}/api/tradesman/jobs/{{jobId}}/status
```

```json
{
  "status": "IN_PROGRESS"
}
```

Then:

```json
{
  "status": "COMPLETED"
}
```

---

## Suggested Postman order

1. Login user, tradesman, admin  
2. Admin: list token-rules → change `tokenCost`  
3. Tradesman: buy package (or admin grant tokens) → check wallet  
4. User: categories → post job  
5. Tradesman: job details → send quote (`amount` 2100) → confirm `tokensCharged`  
6. User: list quotes → hire → list bookings  

---

## Quick checks

| What | Request |
|---|---|
| Token prices | `GET /api/admin/token-rules` |
| Change price | `PUT /api/admin/token-rules/:id` `{ "tokenCost": 45, ... }` |
| Buy tokens | `POST /api/packages/:id/checkout` |
| Wallet | `GET /api/tradesman/wallet` |
| Book service | `POST /api/quotes/:id/hire` |

Job details without login → **401**.  
Quote without enough tokens → **400**.  
Hire by someone who is not the job owner → **403**.
