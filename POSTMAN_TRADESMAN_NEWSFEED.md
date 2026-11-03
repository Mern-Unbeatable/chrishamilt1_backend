# Postman — tradesman newsfeed hide

Tradesman je job e **buy** ba **quote** koreche, oita tar `GET /api/jobs` newsfeed e asbe na. Ei file diye total check koro.

Local: `http://localhost:3000`  
Live: `https://api.tradersinloop.co.uk`

---

## What happens

| Who | `GET /api/jobs` |
|---|---|
| No token (public) | All `OPEN` jobs (except 2-quote-full / hired) |
| Tradesman + Bearer token | Same list, **minus jobs this tradesman bought or quoted** |
| Other tradesman + their token | Ei tradesman-er quoted job **dekhabe** (jodi 2 quote na hoy) |
| After 2 quotes on a job | Job **sobar** newsfeed theke hide |
| After customer hire | Job public list theke hide |

**Token na dile hide hobe na.** Newsfeed request e tradesman Bearer lagbe.

---

## Postman setup

| Variable | Save from |
|---|---|
| `baseUrl` | `http://localhost:3000` or live API |
| `userToken` | customer login |
| `tradesmanToken` | tradesman A login |
| `tradesmanBToken` | tradesman B login (optional) |
| `adminToken` | admin login (tokens grant) |
| `tradesmanId` | tradesman A `data.user.id` |
| `categoryId` | GET categories |
| `jobId` | POST job |

Authorization: **Bearer Token**.  
JSON: Body → **raw → JSON**.

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

Tradesman A:

```json
{
  "email": "daniel.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `tradesmanToken`  
Save `data.user.id` → `tradesmanId`

Optional tradesman B (onno tradesman dekhte pay kina):

```json
{
  "email": "liam.flow@test.com",
  "password": "Password1"
}
```

Save `data.token` → `tradesmanBToken`

---

## 2. Give tradesman A tokens

Bearer: `{{adminToken}}`

```
PATCH {{baseUrl}}/api/admin/tradesmen/{{tradesmanId}}/tokens
```

```json
{
  "amount": 100
}
```

---

## 3. Customer posts a job

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/categories
```

Save `id` → `categoryId`

```
POST {{baseUrl}}/api/jobs
```

```json
{
  "title": "Newsfeed hide test job",
  "description": "Should leave tradesman A feed after buy/quote",
  "categoryId": "{{categoryId}}",
  "location": "Kensington, London",
  "city": "London",
  "budgetMin": 1500,
  "budgetMax": 2500,
  "urgency": "MEDIUM"
}
```

Save `data.id` → `jobId`

---

## 4. Newsfeed WITHOUT token — job shows

Auth **off**. No Bearer.

```
GET {{baseUrl}}/api/jobs?page=1&limit=20
```

`data` te `{{jobId}}` **thakbe**. Public list, hide hoy na.

---

## 5. Newsfeed WITH tradesman A token — job still shows (not bought yet)

Authorization: Bearer `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs?page=1&limit=20
```

`{{jobId}}` **thakbe**. Preview only (`unlocked: false`, `customer: null`).

---

## 6. Preview (no deduct)

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

`unlocked` false. Wallet same.

---

## 7. Buy the job

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}?buy=true
```

`unlocked` true. `tokensCharged` > 0 first time.

---

## 8. Newsfeed after BUY — job hidden for A

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs?page=1&limit=20
```

`{{jobId}}` **asbe na**.

No token diye same GET: `{{jobId}}` **thakbe** (public).

Tradesman B token dile: `{{jobId}}` **thakbe**.

---

## 9. Quote (tokens deduct here if not already bought)

Bearer: `{{tradesmanToken}}`

```
POST {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

```json
{
  "amount": 2100,
  "estimatedDuration": "3 days",
  "startDate": "2026-11-03",
  "materialsIncluded": false,
  "warranty": "12-month labour",
  "proposal": "I can complete this job."
}
```

Save `data.id` → `quoteId`

---

## 10. Newsfeed after QUOTE — still hidden for A

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/jobs?page=1&limit=20
```

`{{jobId}}` **asbe na**.

Bought jobs dashboard e thake:

```
GET {{baseUrl}}/api/tradesman/dashboard
```

`data.purchasedJobs` e `{{jobId}}` thakbe.

```
GET {{baseUrl}}/api/tradesman/jobs
```

`purchasedJobs` e o ashe.

---

## 11. Two quotes — hidden for everyone

Tradesman B o buy + quote korle job **public** `GET /api/jobs` (no token) thekeo hide.

---

## Order in Postman

1. Login customer + tradesman A (+ B optional)  
2. Admin grant tokens  
3. Customer POST job → `jobId`  
4. GET `/api/jobs` **no auth** → job **shows**  
5. GET `/api/jobs` **tradesman A token** → job **shows**  
6. GET `/api/jobs/:id` preview  
7. GET `/api/jobs/:id?buy=true`  
8. GET `/api/jobs` **tradesman A token** → job **gone**  
9. GET `/api/jobs` **no auth** → job **still there**  
10. POST quote  
11. GET `/api/jobs` **tradesman A token** → job **still gone**  

---

## If job still shows after buy/quote

| Check | Meaning |
|---|---|
| Authorization empty / wrong token | Public list — hide chalbe na |
| Token is `userToken` not `tradesmanToken` | Customer list, hide nai |
| Looking at dashboard / `purchasedJobs` | Oita newsfeed na — bought job **thakbe** |
| Live API old deploy | Local `npm run dev` e test koro |
