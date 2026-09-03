# Chrishamilt1 Backend — Postman Test Guide

Base URL: `http://localhost:3000`

Start the server first:

```bash
npm run dev
```

## Postman setup

1. Create a collection named **Chrishamilt1**.
2. Add collection variables:

| Variable | Example |
|---|---|
| `baseUrl` | `http://localhost:3000` |
| `userToken` | *(paste after user login)* |
| `tradesmanToken` | *(paste after tradesman login)* |
| `adminToken` | *(paste after admin login)* |
| `categoryId` | *(copy from GET categories)* |
| `jobId` | *(copy after posting a job)* |
| `quoteId` | *(copy after sending a quote)* |
| `bookingId` | *(copy after hire)* |
| `reviewId` | *(copy after review)* |
| `tradesmanId` | *(copy from tradesman register/login)* |
| `userId` | *(copy from user register/login)* |
| `conversationId` | *(copy after starting a chat)* |
| `packageId` | *(copy from GET packages)* |

3. For every protected request:
   - **Authorization** → Type: `Bearer Token`
   - Token: `{{userToken}}` or `{{tradesmanToken}}` or `{{adminToken}}`
4. Body type is always **raw → JSON**.

Auth header:

```
Authorization: Bearer {{userToken}}
```

---

## Suggested test order

1. Welcome + health
2. Register **USER**, **TRADESMAN**, **ADMIN** → login each → save tokens
3. Get categories → save `categoryId`
4. User posts a job → save `jobId`
5. Admin grants tokens to the tradesman
6. Tradesman sends a quote → save `quoteId`
7. User views quotes → hires → save `bookingId`
8. Tradesman updates job: `IN_PROGRESS` then `COMPLETED`
9. User leaves a review → tradesman replies
10. Open chat (quote already created a conversation) → user and tradesman send messages
11. Check dashboard, bookings, my jobs, admin lists

---

## 1. Welcome

### GET `/`

No auth.

```
GET {{baseUrl}}/
```

Expected:

```json
{
  "success": true,
  "message": "Welcome to the chrishamilt1 backend Project"
}
```

### GET `/api`

```
GET {{baseUrl}}/api
```

Same welcome response.

### GET `/health`

```
GET {{baseUrl}}/health
```

---

## 2. Auth

Roles: `USER` | `TRADESMAN` | `ADMIN`

Password must be at least **8 characters**. Token lasts **40 days**.

### POST `/api/auth/register` — User

```
POST {{baseUrl}}/api/auth/register
```

```json
{
  "fullName": "Sarah Morrison",
  "email": "sarah@test.com",
  "phoneNumber": "+44 7911 234 567",
  "address": "Kensington, London",
  "password": "Password1",
  "role": "USER"
}
```

Save `data.token` → `userToken`  
Save `data.user.id` → `userId`

### POST `/api/auth/register` — Tradesman

```json
{
  "fullName": "Daniel Hughes",
  "email": "daniel@test.com",
  "phoneNumber": "+44 7700 900123",
  "address": "Manchester, UK",
  "password": "Password1",
  "role": "TRADESMAN"
}
```

New tradesmen get **100 tokens**.  
Save `data.token` → `tradesmanToken`  
Save `data.user.id` → `tradesmanId`

### POST `/api/auth/register` — Admin

```json
{
  "fullName": "Atik Adnan",
  "email": "admin@test.com",
  "phoneNumber": "+44 7700 111222",
  "address": "London, UK",
  "password": "AdminPass1",
  "role": "ADMIN"
}
```

Save `data.token` → `adminToken`

If an email already exists, use login instead, or change the email.

### POST `/api/auth/login`

```
POST {{baseUrl}}/api/auth/login
```

```json
{
  "email": "sarah@test.com",
  "password": "Password1",
  "rememberMe": true
}
```

Repeat for `daniel@test.com` and `admin@test.com`.

### GET `/api/auth/me`

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/auth/me
```

---

## 3. Profile

All require Bearer token of the logged-in user.

### GET `/api/users/profile`

```
GET {{baseUrl}}/api/users/profile
```

### PUT `/api/users/profile`

```
PUT {{baseUrl}}/api/users/profile
```

```json
{
  "firstName": "Sarah",
  "lastName": "Morrison",
  "phoneNumber": "+44 7911 234 567",
  "address": "Kensington, London",
  "region": "Greater London",
  "city": "London",
  "zipCode": "SW7 1AA"
}
```

### PUT `/api/users/change-password`

```
PUT {{baseUrl}}/api/users/change-password
```

```json
{
  "currentPassword": "Password1",
  "newPassword": "Password2",
  "confirmPassword": "Password2"
}
```

After this, login with the new password.

---

## 4. Categories

### GET `/api/categories`

No auth.

```
GET {{baseUrl}}/api/categories
```

Results are newest first (`createdAt` descending). The response includes `totalCategories` above the list. Copy a Plumbing (or any) `id` → `categoryId`.

### POST `/api/categories` — Admin only

Bearer: `{{adminToken}}`

```
POST {{baseUrl}}/api/categories
```

```json
{
  "name": "Kitchen Fitting",
  "icon": "wrench"
}
```

`icon` is required. Store a frontend icon key only (`wrench`, `droplet`, `bolt`). Do not upload icon files. The 500-icon picker stays on the frontend.

`GET /api/categories` now returns `icon` for landing-page chips.

### PUT `/api/categories/:id` — Admin only

Bearer: `{{adminToken}}`

```
PUT {{baseUrl}}/api/categories/{{categoryId}}
```

```json
{
  "name": "Kitchen Fitting",
  "icon": "hammer"
}
```

Send only the fields you want to change.

### DELETE `/api/categories/:id` — Admin only

Bearer: `{{adminToken}}`

```
DELETE {{baseUrl}}/api/categories/{{categoryId}}
```

Do not delete a category that already has jobs.

---

## 5. Jobs

### POST `/api/jobs` — User only

Bearer: `{{userToken}}`

```
POST {{baseUrl}}/api/jobs
```

Use **form-data** in Postman (Body → form-data). Do not set Content-Type manually.

| Key | Type | Value |
|---|---|---|
| title | Text | Complete Bathroom Renovation — Full Replumb & Tile |
| description | Text | Victorian townhouse bathroom renovation... |
| categoryId | Text | `{{categoryId}}` |
| location | Text | Kensington, London |
| city | Text | London |
| budgetMin | Text | 2400 |
| budgetMax | Text | 3200 |
| urgency | Text | HIGH |
| preferredStart | Text | 2026-08-15 |
| completionBy | Text | 2026-09-30 |
| specialNotes | Text | Access available Mon-Fri 8am-6pm. |
| requirements | Text | City & Guilds or NVQ Level 3 in Plumbing |
| requirements | Text | Gas Safe registered |
| requirements | Text | Public liability insurance (min £2m) |
| images | File | *(choose an image)* |
| images | File | *(add another image if needed)* |

You can also send `requirements` as one JSON string:

```
["Gas Safe registered","Minimum 5 years experience"]
```

Uploaded files are stored on the server and returned as:

```
https://tradesinloop-backend.maktechgroup.tech/uploads/<filename>
```

Allowed images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.svg`. Max 10 files, 5MB each.

`urgency`: `LOW` | `MEDIUM` | `HIGH`  
Save `data.id` → `jobId`

JSON raw body still works if you send image URLs instead of files.

### GET `/api/jobs` — Browse / Filter Job Opportunities (public)

No auth. Use this for the **Filter Job Opportunities** screen.

First load categories for the Trade Category dropdown:

```
GET {{baseUrl}}/api/categories
```

Copy a category `slug` (example: `plumbing`) or `id`.

Then browse jobs:

```
GET {{baseUrl}}/api/jobs
```

`pagination.total` is the **Showing X jobs** count.

All query params are optional. Combine any of them.

| UI filter | Query param | Notes |
|---|---|---|
| Trade Category | `category` | slug, name, or category id (`plumbing`, `Electrical`, or UUID) |
| Location | `location` | partial match, case-insensitive (`London`) |
| Budget Range | `minBudget` + `maxBudget` | see ranges below |
| Search | `search` | matches title, description, location |
| Urgency | `urgency` | `LOW` \| `MEDIUM` \| `HIGH` |
| Page | `page` | default `1` |
| Per page | `limit` | default `10` |

**Budget Range dropdown**

| UI option | Request |
|---|---|
| Any Budget | omit both |
| Under £1,000 | `?maxBudget=1000` |
| £1,000–£5,000 | `?minBudget=1000&maxBudget=5000` |
| £5,000–£10,000 | `?minBudget=5000&maxBudget=10000` |
| £10,000+ | `?minBudget=10000` |

**Test requests**

All jobs (Any Budget, All Trade Categories):

```
GET {{baseUrl}}/api/jobs?page=1&limit=10
```

Trade category only:

```
GET {{baseUrl}}/api/jobs?category=plumbing
```

Location only:

```
GET {{baseUrl}}/api/jobs?location=London
```

Budget: Under £1,000

```
GET {{baseUrl}}/api/jobs?maxBudget=1000
```

Budget: £1,000–£5,000

```
GET {{baseUrl}}/api/jobs?minBudget=1000&maxBudget=5000
```

Budget: £5,000–£10,000

```
GET {{baseUrl}}/api/jobs?minBudget=5000&maxBudget=10000
```

Budget: £10,000+

```
GET {{baseUrl}}/api/jobs?minBudget=10000
```

All three filters together (category + location + budget):

```
GET {{baseUrl}}/api/jobs?category=plumbing&location=London&minBudget=1000&maxBudget=5000&page=1&limit=10
```

Full example with search and urgency:

```
GET {{baseUrl}}/api/jobs?category=plumbing&location=London&search=Bathroom&minBudget=1000&maxBudget=5000&urgency=HIGH&page=1&limit=10
```

Expected shape:

```json
{
  "success": true,
  "message": "Jobs fetched",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 11,
    "totalPages": 2
  }
}
```

`pagination.total` = Showing **11 jobs**.

### GET `/api/jobs/mine` — User

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/jobs/mine?status=OPEN
```

`status`: `OPEN` | `ACCEPTED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`

### GET `/api/jobs/:id`

```
GET {{baseUrl}}/api/jobs/{{jobId}}
```

Auth optional. Customer contact is shown to the owner, tradesman, or admin.

### PUT `/api/jobs/:id` — Owner / Admin

Bearer: `{{userToken}}`

Only while the job is `OPEN`.

```
PUT {{baseUrl}}/api/jobs/{{jobId}}
```

```json
{
  "title": "Complete Bathroom Renovation — Full Replumb & Tile",
  "budgetMin": 2500,
  "budgetMax": 3300,
  "specialNotes": "Updated access: weekdays only."
}
```

### PATCH `/api/jobs/:id/cancel` — Owner / Admin

Bearer: `{{userToken}}`

```
PATCH {{baseUrl}}/api/jobs/{{jobId}}/cancel
```

Use a different job for cancel tests so you can still run the hire flow.

Sets `status` to `CANCELLED`. The job stays in `GET /api/jobs/mine`.

### DELETE `/api/jobs/:id` — Owner / Admin (hard delete)

Bearer: `{{userToken}}`

```
DELETE {{baseUrl}}/api/jobs/{{jobId}}
```

Permanently removes the job. It will not appear in My Job Post after this.

Use a spare job for this test. Do not delete the job you need for quotes / hire / review.

Expected:

```json
{
  "success": true,
  "message": "Job deleted",
  "data": {
    "id": "{{jobId}}"
  }
}
```

Then `GET /api/jobs/mine` no longer includes that job. `GET /api/jobs/{{jobId}}` returns 404.

---

## 6. Quotes

Sending a quote deducts tokens (usually **14**). If the tradesman has 0 tokens, grant some first (section 11).

### POST `/api/jobs/:id/quotes` — Tradesman only

Bearer: `{{tradesmanToken}}`

```
POST {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

Use **form-data** in Postman (Body → form-data). Do not set Content-Type manually.

| Key | Type | Value |
|---|---|---|
| amount | Text | 2100 |
| estimatedDuration | Text | 3 days |
| startDate | Text | 2026-08-09 |
| materialsIncluded | Text | false |
| warranty | Text | 12-month labour guarantee |
| proposal | Text | Competitive quote including all labour... |
| images | File | *(choose an image)* |
| images | File | *(add another image if needed)* |

Uploaded files are stored on the server and returned as:

```
https://tradesinloop-backend.maktechgroup.tech/uploads/<filename>
```

Allowed images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.svg`. Max 10 files, 5MB each.

Save `data.id` → `quoteId`

JSON raw body still works if you send image URLs instead of files.

### GET `/api/jobs/:id/quotes` — Job owner / Admin

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/jobs/{{jobId}}/quotes
```

### GET `/api/quotes/mine` — Tradesman

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/quotes/mine?status=SUBMITTED&page=1&limit=10
```

`status`: `SUBMITTED` | `ACCEPTED` | `REJECTED` | `WITHDRAWN`

### GET `/api/quotes/:id`

Bearer: owner, quoting tradesman, or admin.

```
GET {{baseUrl}}/api/quotes/{{quoteId}}
```

### PUT `/api/quotes/:id` — Tradesman (own submitted quote)

Bearer: `{{tradesmanToken}}`

```
PUT {{baseUrl}}/api/quotes/{{quoteId}}
```

Form-data (same as create). You can send only the fields you want to change, plus new `images` files if needed.

| Key | Type | Value |
|---|---|---|
| amount | Text | 2200 |
| estimatedDuration | Text | 4 days |
| proposal | Text | Updated proposal with extra materials note. |
| images | File | *(optional new image)* |

### PATCH `/api/quotes/:id/withdraw` — Tradesman

Bearer: `{{tradesmanToken}}`

```
PATCH {{baseUrl}}/api/quotes/{{quoteId}}/withdraw
```

Do this on a second quote if you still want to test hire.

### POST `/api/quotes/:id/hire` — User (job owner)

Bearer: `{{userToken}}`

```
POST {{baseUrl}}/api/quotes/{{quoteId}}/hire
```

Creates a booking, assigns the tradesman, rejects other quotes.  
Save `data.id` → `bookingId`

---

## 7. Bookings (My Booking)

### GET `/api/bookings` — User only

Bearer: `{{userToken}}`

```
GET {{baseUrl}}/api/bookings?status=ACCEPTED&page=1&limit=10
```

`status`: `ACCEPTED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`

### GET `/api/bookings/:id` — User / Tradesman / Admin

```
GET {{baseUrl}}/api/bookings/{{bookingId}}
```

Use `{{userToken}}` or `{{tradesmanToken}}`.

### PATCH `/api/bookings/:id/cancel` — User / Admin

Only while `ACCEPTED` or `IN_PROGRESS`.

```
PATCH {{baseUrl}}/api/bookings/{{bookingId}}/cancel
```

Use a second booking for cancel tests if you want to complete the review flow.

---

## 8. Tradesman jobs and dashboard

### GET `/api/tradesman/dashboard`

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/dashboard
```

### GET `/api/tradesman/earnings`

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/earnings?page=1&limit=10
```

Tradesman only. Use this for the **Earnings** page.

| UI | Field |
|---|---|
| Today | `summary.today` |
| This week | `summary.thisWeek` |
| Week +% | `summary.thisWeekChangePercent` (vs last week) |
| This month | `summary.thisMonth` |
| Month +% | `summary.thisMonthChangePercent` (vs last month) |
| Lifetime | `summary.lifetime` |
| Average job value | `revenue.averageJobValue` |
| Completed jobs | `revenue.completedJobs` |
| Year line chart | `charts.monthlyRevenue` (last 12 months) |
| Payout line | `payoutNote` |
| Recent payouts / export rows | `recent.items` |

Week starts on **Monday**. Completing a job (`PATCH /api/tradesman/jobs/:id/status` → `COMPLETED`) creates the earning row.

Expected shape:

```json
{
  "success": true,
  "message": "Earnings fetched",
  "data": {
    "summary": {
      "today": 420,
      "thisWeek": 2310,
      "thisWeekChangePercent": 8,
      "thisMonth": 8320,
      "thisMonthChangePercent": 21,
      "lifetime": 126480
    },
    "revenue": {
      "averageJobValue": 972,
      "completedJobs": 87
    },
    "payoutNote": "Payouts land 2 working days after customer approval.",
    "charts": {
      "monthlyRevenue": [
        { "month": "2025-09", "label": "Sep", "amount": 3200 }
      ]
    },
    "recent": {
      "items": [],
      "total": 0,
      "page": 1,
      "limit": 10
    }
  }
}
```

### GET `/api/tradesman/jobs`

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/jobs?status=ACCEPTED
```

### PATCH `/api/tradesman/jobs/:id/status`

Bearer: `{{tradesmanToken}}`  
`:id` is the **job id**, not the booking id.

Allowed moves:

- `ACCEPTED` → `IN_PROGRESS`
- `IN_PROGRESS` → `COMPLETED`

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

Completing a job records earnings and increments jobs completed.

---

## 9. Reviews

Review is allowed only after the booking is `COMPLETED`.

### POST `/api/reviews` — User

Bearer: `{{userToken}}`

```
POST {{baseUrl}}/api/reviews
```

```json
{
  "jobId": "{{jobId}}",
  "rating": 5,
  "comment": "Excellent work, tidy and on time."
}
```

`rating` is 1–5.  
Save `data.id` → `reviewId`

### GET `/api/reviews/mine` — Tradesman

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/reviews/mine?page=1&limit=10
```

### GET `/api/reviews/tradesman/:id`

No auth required.

```
GET {{baseUrl}}/api/reviews/tradesman/{{tradesmanId}}
```

### PATCH `/api/reviews/:id/reply` — Tradesman

Bearer: `{{tradesmanToken}}`

```
PATCH {{baseUrl}}/api/reviews/{{reviewId}}/reply
```

```json
{
  "reply": "Thank you, glad the bathroom came out well."
}
```

---

## 10. Admin

All require Bearer: `{{adminToken}}`

### GET `/api/admin/dashboard`

```
GET {{baseUrl}}/api/admin/dashboard
```

Admin only. Use this for the admin **Dashboard** screen.

| UI card | Field |
|---|---|
| Total Customers | `cards.totalCustomers` |
| Total Tradesmen | `cards.totalTradesmen` |
| Active Tradesmen | `cards.activeTradesmen` |
| Low Token Accounts | `cards.lowTokenAccounts` (balance below `cards.lowTokenThreshold`, default 20) |
| Jobs Posted | `cards.jobsPosted` |
| Open Jobs | `cards.openJobs` |
| Completed Jobs | `cards.completedJobs` |
| Quotes Today | `cards.quotesToday` |
| Token Sales Today | `cards.tokenSalesToday` |
| Monthly Revenue | `cards.monthlyRevenue` |
| Total Tokens Sold | `cards.totalTokensSold` |
| Tokens Used | `cards.tokensUsed` |

| UI chart | Field |
|---|---|
| Monthly earnings (paid invoices) | `charts.monthlyEarnings` |
| Jobs completed (monthly volume) | `charts.jobsCompleted` |
| Customer & Tradesman growth | `charts.growth` (`newCustomers` / `newTradesmen` plus running `customers` / `tradesmen`) |
| Top Token Buyers | `topTokenBuyers` (`rank`, `name`, `amount`, `tokens`) |

Token sales / revenue / top buyers use **completed** token purchases. Those stay `0` until tradesmen buy packages.

### GET `/api/admin/customers`

```
GET {{baseUrl}}/api/admin/customers?page=1&limit=10&search=Sarah&status=ACTIVE
```

`status`: `ACTIVE` | `SUSPENDED`

### GET `/api/admin/tradesmen`

```
GET {{baseUrl}}/api/admin/tradesmen?page=1&limit=10
```

### PATCH `/api/admin/users/:id/status`

```
PATCH {{baseUrl}}/api/admin/users/{{userId}}/status
```

```json
{
  "status": "SUSPENDED"
}
```

Set back to `ACTIVE` before more user tests.

```json
{
  "status": "ACTIVE"
}
```

### PATCH `/api/admin/tradesmen/:id/tokens`

```
PATCH {{baseUrl}}/api/admin/tradesmen/{{tradesmanId}}/tokens
```

```json
{
  "amount": 100
}
```

Adds tokens (does not replace the balance).

### GET `/api/admin/packages` — Token packages

```
GET {{baseUrl}}/api/admin/packages
```

### POST `/api/admin/packages` — Create package

```
POST {{baseUrl}}/api/admin/packages
```

```json
{
  "name": "Starter",
  "price": 30,
  "tokenQuantity": 100,
  "description": "Perfect for tradesmen getting started.",
  "isPopular": false,
  "stripePriceId": "price_1UBSnvPc4Do23EYoZc37LZnO"
}
```

### PUT `/api/admin/packages/:id` — Edit package

```
PUT {{baseUrl}}/api/admin/packages/{{packageId}}
```

```json
{
  "name": "Starter",
  "price": 30,
  "tokenQuantity": 100,
  "description": "Perfect for tradesmen getting started.",
  "isPopular": true,
  "stripePriceId": "price_1UBSnvPc4Do23EYoZc37LZnO"
}
```

`isPopular: true` sets the **MOST POPULAR** badge.

### DELETE `/api/admin/packages/:id`

```
DELETE {{baseUrl}}/api/admin/packages/{{packageId}}
```

Hard-deletes if unused. If the package already has purchases, it is only deactivated.

---

## 11. Token packages / Stripe (tradesman buy)

Anyone can list packages. **Only a tradesman** can pay.

### GET `/api/packages`

```
GET {{baseUrl}}/api/packages
```

Returns Starter / Professional / Business for the wallet and pricing page.

### POST `/api/packages/:id/checkout` — Tradesman only

Bearer: `{{tradesmanToken}}`

```
POST {{baseUrl}}/api/packages/{{packageId}}/checkout
```

Open `data.checkoutUrl` in the browser and pay with a Stripe test card: `4242 4242 4242 4242`.

You only need this one API. After pay, Stripe hits:

`https://tradesinloop-backend.maktechgroup.tech/api/packages/stripe/success?session_id={CHECKOUT_SESSION_ID}`

That adds tokens, then redirects to:

`https://tradesinloop.maktechgroup.tech/wallet?status=success`

`POST /api/packages/confirm` is optional (safe to call twice).

### POST `/api/packages/confirm` — optional

```
POST {{baseUrl}}/api/packages/confirm
```

```json
{
  "sessionId": "cs_test_..."
}
```

This checks Stripe that the session is `paid`, then adds tokens to the wallet. Safe to call twice.

### GET `/api/tradesman/purchases`

Bearer: `{{tradesmanToken}}`

```
GET {{baseUrl}}/api/tradesman/purchases?page=1&limit=10
```

---

## 12. Live chat

User and tradesman can message each other. A conversation is created automatically when a tradesman sends a quote (or when a user hires). Both sides can also start a chat manually.

All chat routes need a Bearer token. Use `{{userToken}}` or `{{tradesmanToken}}`.

### POST `/api/conversations` — Start / find chat

User starts a chat with a tradesman:

```
POST {{baseUrl}}/api/conversations
```

Bearer: `{{userToken}}`

```json
{
  "tradesmanId": "{{tradesmanId}}",
  "jobId": "{{jobId}}"
}
```

Tradesman starts a chat with a customer:

Bearer: `{{tradesmanToken}}`

```json
{
  "customerId": "{{userId}}",
  "jobId": "{{jobId}}"
}
```

`jobId` is optional. Save `data.id` → `conversationId`.

### GET `/api/conversations` — Inbox

```
GET {{baseUrl}}/api/conversations?page=1&limit=20
```

`total` is at the top. Each item includes `lastMessage`, `unreadCount`, and `otherParty`.

### GET `/api/conversations/:id`

```
GET {{baseUrl}}/api/conversations/{{conversationId}}
```

### GET `/api/conversations/:id/messages`

```
GET {{baseUrl}}/api/conversations/{{conversationId}}/messages?page=1&limit=30
```

Newest messages first. `total` is at the top.

### POST `/api/conversations/:id/messages` — Send

```
POST {{baseUrl}}/api/conversations/{{conversationId}}/messages
```

```json
{
  "content": "Hi, when can you start the bathroom job?"
}
```

Then reply with the other token:

```json
{
  "content": "I can start Monday morning if that works."
}
```

### PATCH `/api/conversations/:id/read`

```
PATCH {{baseUrl}}/api/conversations/{{conversationId}}/read
```

Marks the other person's messages as read.

### Socket.IO (live)

URL: `{{baseUrl}}`  
Auth: `auth: { token: "<jwt>" }`

| Client sends | Server emits |
|---|---|
| `conversation:join` `{ conversationId }` | — |
| `message:send` `{ conversationId, content }` | `message:new` |
| `message:read` `{ conversationId }` | `message:read` |
| `typing:start` / `typing:stop` | `typing` |

REST send also emits `message:new` so a connected client still gets live updates.

---

## Quick role map

| Who | Can do |
|---|---|
| Anyone | Welcome, health, browse jobs, list categories, public reviews |
| USER | Post jobs, view own quotes, hire, bookings, review, chat with tradesman |
| TRADESMAN | Quote, my quotes, my jobs, dashboard, earnings, buy token packages, reply to reviews, chat with customer |
| ADMIN | Dashboard, categories CRUD, customers/tradesmen lists, suspend, grant tokens, token packages, view chats |

---

## Common errors

| Status | Meaning |
|---|---|
| 401 | Missing or expired token |
| 403 | Wrong role, or not the owner |
| 404 | Id not found |
| 409 | Email already registered, or already quoted / reviewed |
| 422 | Validation failed — check required fields |
| 400 | Not enough tokens, job not open, or invalid status change |
