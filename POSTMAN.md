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
10. Check dashboard, bookings, my jobs, admin lists

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
  "name": "Kitchen Fitting"
}
```

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

### GET `/api/jobs` — Browse (public)

```
GET {{baseUrl}}/api/jobs?category=plumbing&location=London&search=Bathroom&minBudget=1000&maxBudget=5000&urgency=HIGH&page=1&limit=10
```

All query params are optional.

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

---

## Quick role map

| Who | Can do |
|---|---|
| Anyone | Welcome, health, browse jobs, list categories, public reviews |
| USER | Post jobs, view own quotes, hire, bookings, review |
| TRADESMAN | Quote, my quotes, my jobs, dashboard, reply to reviews |
| ADMIN | Categories CRUD, customers/tradesmen lists, suspend, grant tokens |

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
