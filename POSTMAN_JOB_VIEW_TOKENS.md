# Postman — job details token deduct

Tradesman job details page open korle wallet theke token kate. Ei file diye Postman e test koro.

Local: `http://localhost:3000`  
Live: `https://api.tradersinloop.co.uk`

---

## What happens

1. Tradesman tokens buy kore (Stripe package) ba admin grant pay.
2. Job list browse e token **kate na**.
3. Tradesman job details (`GET /api/jobs/:id`) open korle job-er `leadPrice` tokens **ekbar** kate.
4. Same job abar open korle ar kate na.
5. Token kom thakle details pabe na — `400`.
6. Customer contact tokhoni ashe jokhon unlock hoy.

Owner / admin charge hoy na.

| Job `budgetMax` | Tokens deducted |
|---|---|
| £0 – £100 | 10 |
| £100 – £250 | 15 |
| £250 – £500 | 20 |
| £500 – £1,000 | 30 |
| £1,000 – £4,000 | 40 |
| £4,000+ | 50 |

Exact boundary (e.g. £100) uses the higher range. Admin `tokenCost` change korte pare.

---

## Postman setup

Collection variables:

| Variable | Save from |
|---|---|
| `baseUrl` | `http://localhost:3000` or live API |
| `adminToken` | admin login |
| `tradesmanToken` | tradesman login |
| `userToken` | customer login (job post er jonno) |
| `tradesmanId` | tradesman login `data.user.id` |
| `jobId` | POST job or GET jobs |
| `packageId` | GET packages (jodi Stripe diye kino) |

Authorization: **Bearer Token**.  
JSON: Body → **raw → JSON**.

---

## 1. Login

```
POST {{baseUrl}}/api/auth/login
```

Admin:

```json
{
  "email": "admin@tradersinloop.co.uk",
  "password": "Password1"
}
```

Save `data.token` → `adminToken`

Tradesman:

```json
{
  "email": "daniel.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `tradesmanToken`  
Save `data.user.id` → `tradesmanId`

Customer (job create korte):

```json
{
  "email": "sarah.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `userToken`

Register first if these emails do not exist (`role`: `ADMIN` / `TRADESMAN` / `USER`).

---

## 2. Wallet before

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/wallet
```

Note `availableTokens` and `tokensUsed`.

---

## 3. Give the tradesman tokens

Postman e fast test: admin grant. Live flow: package buy.

### Option A — Admin grant (easy)

Bearer: `{{adminToken}}`

```
PATCH {{baseUrl}}/api/admin/tradesmen/{{tradesmanId}}/tokens
```

```json
{
  "amount": 100
}
```

Then wallet check again. `availableTokens` 100 barbe.

### Option B — Buy package (Stripe)

```
GET {{baseUrl}}/api/packages
```

Save a package `id` → `packageId`

Bearer: `{{tradesmanToken}}`

```
POST {{baseUrl}}/api/packages/{{packageId}}/checkout
```

Open `data.checkoutUrl`. Test card: `4242 4242 4242 4242`.

Pay er por wallet e tokens add hobe.

---

## 4. See unlock cost

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/token-rules
```

Job post hole `budgetMax` jei range e pore, oi `tokenCost` = `leadPrice`.

---

## 5. Need an open job

Already open job thakle skip.

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
  "urgency": "MEDIUM"
}
```

£2500 → **£1,000 – £4,000** → `leadPrice` **40**.  
Save `data.id` → `jobId`

---

## 6. Job list — no deduct

No auth needed.

```
GET {{baseUrl}}/api/jobs?page=1&limit=10
```

Wallet same thakbe. List e customer phone/email ashe na. `leadPrice` dekhabe koto token lagbe.

---

## 7. Open job details — tokens deduct

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

First time expected:

```json
{
  "success": true,
  "message": "Job details",
  "data": {
    "id": "{{jobId}}",
    "leadPrice": 40,
    "unlocked": true,
    "tokensCharged": 40,
    "tokensRequired": 40,
    "tokenBalance": 60,
    "customer": {
      "email": "sarah.flow@test.com",
      "phoneNumber": "..."
    }
  }
}
```

`tokensCharged` = ei request e koto kata.  
`tokenBalance` = unlock er por baki tokens.

---

## 8. Open the same job again — no deduct

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

`tokensCharged` **0**. `unlocked` **true**. Wallet ar kome na.

---

## 9. Wallet after

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/wallet
```

| Field | Expect |
|---|---|
| `availableTokens` | before − `leadPrice` |
| `tokensUsed` | before + `leadPrice` |

---

## 10. Not enough tokens

Notun job dao jeno `leadPrice` wallet theke beshi hoy. Or tradesman er balance 0 kore test koro.

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs/{{otherJobId}}
```

Expected:

```json
{
  "success": false,
  "message": "Not enough tokens to view this job",
  "errors": {
    "tokensRequired": 40,
    "tokenBalance": 0
  }
}
```

Customer contact asbe na.

---

## 11. Quote after unlock (optional)

Already unlock hole quote e extra token/Stripe nai.

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

Save `data.id` → `quoteId`. Status `SUBMITTED`.

Details na khule quote dile o same unlock ekbar cholbe (token kate), then quote submit hobe.

---

## Order in Postman

1. Login admin + tradesman (+ customer)  
2. GET wallet (before)  
3. Admin grant tokens **or** package checkout  
4. POST job (or pick an open job)  
5. GET jobs list — wallet unchanged  
6. GET job details — `tokensCharged` > 0  
7. GET job details again — `tokensCharged` = 0  
8. GET wallet (after)  
9. Optional: POST quote  

---

## Errors

| Result | Meaning |
|---|---|
| 401 on job details | Not logged in |
| 400 `Not enough tokens to view this job` | Wallet < this job `leadPrice` |
| 404 | Wrong `jobId` |
| Owner / admin GET details | Token kate na |
