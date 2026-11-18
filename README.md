# EnglishYaari Backend Assignment

A REST API for a session-booking platform where teachers publish sessions, users book them, and completed sessions appear in the user's history.

Built with **Node.js, TypeScript, Express, MongoDB and Mongoose**.

---

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Seed data](#seed-data)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Design decisions](#design-decisions)
- [Testing](#testing)
- [Available scripts](#available-scripts)
- [Assumptions](#assumptions)

---

## Overview

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | `POST` | `/users` | Create a user (email must be unique) |
| 2 | `POST` | `/sessions` | Create an `AVAILABLE` session for a teacher |
| 3 | `GET` | `/sessions/available?dateTimestamp=` | List `AVAILABLE` sessions for a UTC day (**aggregation pipeline**) |
| 4 | `POST` | `/sessions/:id/book` | Book an `AVAILABLE` session |
| 5 | `PATCH` | `/sessions/:id/complete` | Mark a `BOOKED` session as `COMPLETED` |
| 6 | `GET` | `/users/:id/sessions` | Upcoming and completed sessions for a user (**aggregation pipeline**) |
| — | `POST` | `/teachers` | Supporting endpoint: create a teacher |
| — | `GET` | `/teachers` | Supporting endpoint: list teachers |
| — | `GET` | `/health` | Health check |

The assignment references `teacherId` but does not define a teacher-creation API, so `POST /teachers` and `GET /teachers` are included as small supporting endpoints. Without them, the session APIs could only be exercised with manually inserted data.

---

## Tech stack

- **Node.js 20+** / **TypeScript 5.9** (strict mode)
- **Express 4**
- **MongoDB 7** / **Mongoose 8**
- **Zod** for request validation
- **Vitest + Supertest + mongodb-memory-server** for automated API tests
- **Helmet, CORS, Morgan** for basic HTTP hardening and logging

---

## Project structure

```text
.
├── src/
│   ├── app.ts                      # Express app (middleware, routes, error handlers)
│   ├── server.ts                   # Startup, DB connection, graceful shutdown
│   ├── config/
│   │   ├── db.ts                   # Mongoose connection helpers
│   │   └── env.ts                  # Environment configuration
│   ├── controllers/                # HTTP request/response handling
│   ├── middlewares/
│   │   ├── error.middleware.ts     # 404 + centralized error handler
│   │   └── validate.middleware.ts  # Zod body/query validation
│   ├── models/                     # User, Teacher, Session Mongoose models
│   ├── routes/                     # Express routers
│   ├── scripts/seed.ts             # Demo data
│   ├── services/                   # Business logic + aggregation pipelines
│   ├── utils/                      # ApiError, asyncHandler, date/ObjectId helpers
│   └── validators/                 # Zod schemas
├── tests/api.test.ts               # End-to-end API tests
├── postman/
│   ├── EnglishYaari.postman_collection.json
│   └── EnglishYaari.postman_environment.json
├── docker-compose.yml              # MongoDB 7
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Getting started

### Prerequisites

- Node.js **20 or newer**
- npm
- Docker Desktop (recommended) **or** a local MongoDB instance

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

```bash
# macOS / Linux
cp .env.example .env

# Windows (cmd)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

### 3. Start MongoDB

```bash
docker compose up -d
```

The included Compose file runs MongoDB 7 and exposes it on host port **27018** (27017 may already be used by a locally installed MongoDB). The matching URI is already in `.env.example`:

```env
MONGODB_URI=mongodb://127.0.0.1:27018/englishyaari
```

To use a different host port:

```bash
# macOS / Linux
MONGO_PORT=27017 docker compose up -d

# Windows PowerShell
$env:MONGO_PORT="27017"; docker compose up -d
```

Then update `MONGODB_URI` in `.env` to match.

If you prefer an existing local MongoDB on `27017`, simply set:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/englishyaari
```

and skip the Compose command.

Check that MongoDB is healthy:

```bash
docker compose ps
```

### 4. Seed demo data (optional, recommended)

```bash
npm run seed
```

The seed script replaces the contents of the `users`, `teachers` and `sessions` collections with a small, demo-ready dataset. It prints the created IDs and ready-to-run `curl` commands.

### 5. Start the API

```bash
# Development (watch mode)
npm run dev
```

The server starts on **http://localhost:3000** by default.

```bash
# Production build
npm run build
npm start
```

Verify it is running:

```bash
curl http://localhost:3000/health
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development`, `test` or `production` |
| `PORT` | No | `3000` | HTTP port |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/englishyaari` | MongoDB connection string |

All configuration is read once at startup from `.env` (via `dotenv`). The `.env` file is git-ignored; `.env.example` documents the expected values.

---

## Seed data

`npm run seed` creates:

**Users**
- Aarav Sharma — `aarav@example.com`
- Priya Verma — `priya@example.com`

**Teachers**
- Rohan Mehta — Spoken English, 8 years
- Neha Kapoor — Business English, 5 years
- Arjun Rao — IELTS Preparation, 10 years

**Sessions**
- Three `AVAILABLE` sessions today (09:00, 11:00, 16:00 UTC)
- One `AVAILABLE` session tomorrow (10:00 UTC)
- One `BOOKED` session today for Aarav (14:00 UTC)
- Two `COMPLETED` sessions yesterday (one for each user)

Fetch today's available sessions (the script prints the exact timestamp):

```bash
curl "http://localhost:3000/sessions/available?dateTimestamp=<today-start-in-ms>"
```

---

## API reference

### Response conventions

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email address" }
  ]
}
```

The `errors` array is included when field-level details are available.

---

### 1. Create user

`POST /users`

**Request body**

```json
{
  "fullName": "Aarav Sharma",
  "email": "aarav@example.com",
  "phone": "+919876543210"
}
```

**Success — `201 Created`**

```json
{
  "success": true,
  "data": {
    "_id": "6918f0c2a4b1c2d3e4f5a6b7",
    "fullName": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "+919876543210",
    "createdAt": "2026-11-16T09:00:00.000Z",
    "updatedAt": "2026-11-16T09:00:00.000Z"
  }
}
```

**Errors:** `400` validation failure, `409` email already exists.

Validation rules: `fullName` 2–100 characters, valid email (stored lowercase), `phone` 7–20 digits with optional leading `+`, spaces or hyphens.

---

### 2. Create session

`POST /sessions`

**Request body**

```json
{
  "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
  "startTime": "2026-11-17T10:00:00.000Z",
  "endTime": "2026-11-17T11:00:00.000Z"
}
```

**Success — `201 Created`**

```json
{
  "success": true,
  "data": {
    "_id": "6918f0c2a4b1c2d3e4f5a6b8",
    "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
    "userId": null,
    "startTime": "2026-11-17T10:00:00.000Z",
    "endTime": "2026-11-17T11:00:00.000Z",
    "status": "AVAILABLE",
    "completedAt": null,
    "createdAt": "2026-11-16T09:00:00.000Z",
    "updatedAt": "2026-11-16T09:00:00.000Z"
  }
}
```

`status` always starts as `AVAILABLE`.

**Errors:** `400` validation failure or `endTime <= startTime`, `404` teacher not found.

---

### 3. Available sessions for booking

`GET /sessions/available?dateTimestamp={timestamp}`

`dateTimestamp` accepts either epoch milliseconds or an ISO-8601 date:

```text
GET /sessions/available?dateTimestamp=1763337600000
GET /sessions/available?dateTimestamp=2026-11-17T00:00:00.000Z
```

The timestamp identifies a **UTC calendar day**; sessions whose `startTime` falls in that day (`[00:00, 24:00)` UTC) and whose status is `AVAILABLE` are returned, sorted by `startTime`.

**Success — `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6918f0c2a4b1c2d3e4f5a6b8",
      "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
      "userId": null,
      "startTime": "2026-11-17T10:00:00.000Z",
      "endTime": "2026-11-17T11:00:00.000Z",
      "status": "AVAILABLE",
      "completedAt": null,
      "createdAt": "2026-11-16T09:00:00.000Z",
      "updatedAt": "2026-11-16T09:00:00.000Z",
      "teacher": {
        "_id": "6918f0c2a4b1c2d3e4f5a6b7",
        "fullName": "Rohan Mehta",
        "email": "rohan@example.com",
        "specialization": "Spoken English",
        "experience": 8
      }
    }
  ]
}
```

Implemented with an aggregation pipeline (`$match` → `$sort` → `$lookup` → `$unwind` → `$project`).

**Errors:** `400` if `dateTimestamp` is missing or invalid.

---

### 4. Book a session

`POST /sessions/:id/book`

**Request body**

```json
{
  "userId": "6918f0c2a4b1c2d3e4f5a6b6"
}
```

**Success — `200 OK`**

```json
{
  "success": true,
  "data": {
    "_id": "6918f0c2a4b1c2d3e4f5a6b8",
    "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
    "userId": "6918f0c2a4b1c2d3e4f5a6b6",
    "startTime": "2026-11-17T10:00:00.000Z",
    "endTime": "2026-11-17T11:00:00.000Z",
    "status": "BOOKED",
    "completedAt": null,
    "createdAt": "2026-11-16T09:00:00.000Z",
    "updatedAt": "2026-11-16T09:05:00.000Z"
  }
}
```

**Errors:** `400` invalid ID, `404` user or session not found, `409` session is not `AVAILABLE` (already booked, completed, etc.).

The update is atomic — the status check and update happen in a single `findOneAndUpdate`, so two concurrent booking requests cannot both succeed.

---

### 5. Mark a session complete

`PATCH /sessions/:id/complete`

**Success — `200 OK`**

```json
{
  "success": true,
  "data": {
    "_id": "6918f0c2a4b1c2d3e4f5a6b8",
    "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
    "userId": "6918f0c2a4b1c2d3e4f5a6b6",
    "startTime": "2026-11-17T10:00:00.000Z",
    "endTime": "2026-11-17T11:00:00.000Z",
    "status": "COMPLETED",
    "completedAt": "2026-11-17T11:00:03.000Z",
    "createdAt": "2026-11-16T09:00:00.000Z",
    "updatedAt": "2026-11-17T11:00:03.000Z"
  }
}
```

**Errors:** `400` invalid ID, `404` session not found, `409` session is not `BOOKED`.

Also atomic: only a `BOOKED` session can transition to `COMPLETED`, and `completedAt` is set to the current server time.

---

### 6. User session list

`GET /users/:id/sessions`

**Success — `200 OK`**

```json
{
  "success": true,
  "data": {
    "upcomingSessions": [
      {
        "_id": "6918f0c2a4b1c2d3e4f5a6b8",
        "teacherId": "6918f0c2a4b1c2d3e4f5a6b7",
        "userId": "6918f0c2a4b1c2d3e4f5a6b6",
        "startTime": "2026-11-17T10:00:00.000Z",
        "endTime": "2026-11-17T11:00:00.000Z",
        "status": "BOOKED",
        "completedAt": null,
        "createdAt": "2026-11-16T09:00:00.000Z",
        "updatedAt": "2026-11-16T09:05:00.000Z",
        "teacher": {
          "_id": "6918f0c2a4b1c2d3e4f5a6b7",
          "fullName": "Rohan Mehta",
          "email": "rohan@example.com",
          "specialization": "Spoken English",
          "experience": 8
        }
      }
    ],
    "completedSessions": [
      {
        "_id": "6918f0c2a4b1c2d3e4f5a6b9",
        "teacherId": "6918f0c2a4b1c2d3e4f5a6ba",
        "userId": "6918f0c2a4b1c2d3e4f5a6b6",
        "startTime": "2026-11-14T10:00:00.000Z",
        "endTime": "2026-11-14T11:00:00.000Z",
        "status": "COMPLETED",
        "completedAt": "2026-11-14T11:00:00.000Z",
        "createdAt": "2026-11-13T09:00:00.000Z",
        "updatedAt": "2026-11-14T11:00:00.000Z",
        "teacher": {
          "_id": "6918f0c2a4b1c2d3e4f5a6ba",
          "fullName": "Neha Kapoor",
          "email": "neha@example.com",
          "specialization": "Business English",
          "experience": 5
        }
      }
    ]
  }
}
```

- `upcomingSessions`: sessions with status `BOOKED`, sorted by `startTime` ascending.
- `completedSessions`: sessions with status `COMPLETED`, sorted by `completedAt` descending.

Implemented with a single aggregation pipeline using `$match` + `$facet`.

**Errors:** `400` invalid user ID, `404` user not found.

---

### Supporting teacher endpoints

`POST /teachers`

```json
{
  "fullName": "Rohan Mehta",
  "email": "rohan@example.com",
  "specialization": "Spoken English",
  "experience": 8
}
```

Returns `201`; `409` for a duplicate email.

`GET /teachers` returns all teachers (newest first).

---

## Error handling

All errors flow through a single Express error middleware. It maps:

| Source | Status | Response |
|--------|--------|----------|
| `ApiError` thrown in a service | as provided | `{ success: false, message }` |
| Zod body/query validation | `400` | field-level `errors` |
| Mongoose validation | `400` | field-level `errors` |
| Invalid ObjectId | `400` | `Invalid <field>` |
| Missing route | `404` | route not found |
| Duplicate key (`11000`) | `409` | `<field> already exists` |
| Malformed JSON | `400` | `Invalid JSON payload` |
| Unexpected error | `500` | generic message in production |

Async controllers are wrapped in `asyncHandler`, so rejected promises are forwarded to this middleware instead of crashing the process.

---

## Design decisions

### Atomic state transitions

Booking and completion use conditional atomic updates:

```ts
Session.findOneAndUpdate(
  { _id: sessionId, status: 'AVAILABLE' },
  { $set: { status: 'BOOKED', userId } },
  { new: true },
);
```

A read-then-write approach would allow two simultaneous requests to both observe `AVAILABLE` and both book the session. With this query, MongoDB updates at most one document and the loser receives no document, which the service maps to `409 Conflict`. The test suite includes a concurrency test that fires two bookings in parallel and asserts exactly one succeeds.

### Aggregation pipelines

- `GET /sessions/available` uses `$match` on `status`/`startTime`/`userId`, `$sort`, then `$lookup` + `$unwind` + `$project` to include teacher details.
- `GET /users/:id/sessions` uses `$match` on `userId`, then `$facet` with two sub-pipelines (booked and completed), each with its own sort and teacher lookup, returning both groups in one database round trip.

### UTC day filtering

The `dateTimestamp` query parameter identifies a calendar day. Day boundaries are computed in **UTC** (`getUtcDayRange`) so behaviour does not silently change with the server's local timezone. A session at `2026-11-17T10:00:00Z` is returned for the timestamp representing `2026-11-17` in UTC, regardless of the machine's locale.

### Validation and ObjectIds

Zod validates request bodies and queries at the HTTP boundary; Mongoose schema validators are a second line of defence (including `endTime > startTime`). `mongoose.isObjectIdOrHexString` is used instead of the looser `isValidObjectId` so 12-character strings are not accidentally cast to ObjectIds.

### Indexes

- `User.email` — unique index for duplicate prevention.
- `Session { status: 1, startTime: 1 }` — supports the available-sessions query and sort.
- `Session { userId: 1, status: 1, startTime: 1 }` — supports the user-history match/facet.

### Layered structure

Routes → controllers → services → models. Controllers only deal with HTTP; services contain business rules and database access; validators and error middleware keep cross-cutting concerns out of the handlers.

### Error envelope

A consistent `{ success, message?, data?, errors? }` envelope makes the API predictable for clients and for the Postman assertions.

---

## Testing

### Automated API tests

```bash
npm test
```

The suite uses **Vitest + Supertest + mongodb-memory-server**, so it does not require Docker or a running MongoDB and never touches the development database. On the first run, `mongodb-memory-server` may download a MongoDB binary (requires internet access); subsequent runs reuse the cached binary. The download can be skipped when MongoDB is already installed locally:

```bash
# macOS / Linux (adjust the path)
MONGOMS_SYSTEM_BINARY=/usr/local/bin/mongod npm test

# Windows PowerShell
$env:MONGOMS_SYSTEM_BINARY="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"; npm test
```

24 tests cover:

- Health check
- User creation, case-insensitive duplicate email (`409`), invalid payload (`400`)
- Teacher creation and duplicate email (`409`)
- Session creation, missing teacher (`404`), invalid time range (`400`)
- Available sessions: UTC day filtering, exclusion of booked/other-day sessions, teacher details, ISO/epoch input, missing/invalid timestamp (`400`)
- Booking: success, unknown user/session (`404`), repeat booking (`409`), **concurrent double booking (exactly one succeeds)**
- Completion: success with `completedAt`, wrong state (`409`), unknown session (`404`)
- User history: correct `$facet` split, unknown user (`404`), invalid user ID (`400`)

### Postman

Import both files from `postman/` into Postman:

1. `EnglishYaari.postman_collection.json`
2. `EnglishYaari.postman_environment.json`

Select the **EnglishYaari Local** environment and run the collection with the Collection Runner. The flow is self-contained: it creates a teacher, user and future session, then queries, books, re-books (expects `409`), completes it and verifies the user's history. IDs and emails are generated/stored in collection variables, so the collection is safe to run repeatedly.

With Newman:

```bash
npx newman run postman/EnglishYaari.postman_collection.json \
  -e postman/EnglishYaari.postman_environment.json
```

The API must be running on `http://localhost:3000` (start with `npm run dev`). If you use a different port, update `baseUrl`.

---

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the API in watch mode (`tsx`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run seed` | Reset collections and insert demo data |
| `npm test` | Run the Vitest API test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check without emitting files |

---

## Assumptions

- **Authentication is out of scope.** The assignment does not ask for login, roles or tokens, so endpoints are unauthenticated and user identity is passed explicitly (`userId` in the booking body, `:id` in paths).
- **Teacher creation** was added as a supporting endpoint because the assignment requires a valid `teacherId` but does not define how teachers are created. The six mandatory APIs are unchanged.
- **Upcoming vs completed** is defined by status: `BOOKED` sessions are upcoming; `COMPLETED` sessions are completed. A booked session whose start time has passed but that has not been marked complete remains in `upcomingSessions`, since the platform has no automatic transition.
- **`completedAt`** is the server time at which `PATCH /complete` is called, not the session's `endTime`.
- **Time filtering** uses UTC calendar days.
- **No pagination** on list endpoints; the assignment's data volume does not require it.
