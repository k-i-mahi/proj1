# Civita v2: Rebuild Plan

This document explains why Civita was rebuilt and what the new version is built from.

## 1. Critique of v1

v1 was a working MERN app. It shows effort, but a reviewer reading it in a hiring context would find
the following problems.

### Security (blocking)

| Problem                                                                                                                           | Where                           | Impact                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| **Password reset returns the reset token in the HTTP response.** Anyone who knows a user's email and name can reset the password. | `authController.forgotPassword` | Full account takeover                                       |
| Reset token comes from `Math.random()` and is stored in plain text for 24 hours                                                   | same                            | Token is predictable and leaks if the DB leaks              |
| JWT lives in `localStorage` (7-day lifetime), with no refresh or revocation                                                       | frontend `authService`          | Any XSS steals the session, and logout never really ends it |
| In development, CORS allows every origin, and the request logger prints full headers, including `Authorization`                   | `server.js`                     | Tokens end up in logs                                       |
| `pre('save')` calls `next()` and then keeps hashing                                                                               | `User.js`                       | Bug: `next` is called twice when the password is unchanged  |

### Architecture

- **Duplicated sources of truth.** Comments live inside `Issue.comments` _and_ in a separate `Interaction` collection. Votes are arrays of user IDs inside the issue _and_ counters in `stats`. They drift apart.
- **Unbounded arrays inside documents** (votes, followers, comments, statusHistory). A popular issue grows toward MongoDB's 16 MB document limit, and every vote rewrites the whole document.
- Controllers of 800 to 1,000 lines that mix validation, business logic, and response shaping. There is no service layer.
- **No tests at all** (`"test": "echo \"Error: no test specified\""`).
- No TypeScript, no shared types between API and UI, and API contracts are implicit.
- "Real-time" works by polling with `setInterval` every 2 to 5 seconds from several hooks at once.

### Frontend

- About 15,000 lines of hand-written CSS spread over 40+ files, plus `*.old.css` and `*.new.css` leftovers. The design is inconsistent from page to page.
- Create React App, which is deprecated and slow.
- Five nested Context providers act as a hand-rolled cache. There is no request deduplication, stale-while-revalidate, or optimistic updates.
- Debug code ships to production (`InteractionDebug`, `testServices`, `serviceValidator`, 150+ `console.log` calls).
- The app shows a "Loading Services..." screen until the backend answers.
- Accessibility is minimal: custom modals without focus traps, and emoji used as icons.

### Repository hygiene

- The README is garbled (two READMEs merged line by line) and uses placeholder screenshots.
- It links a `LICENSE` file that doesn't exist.
- Stray files (`aa.txt`, `setup.js`), no CI, no Docker, no `.env.example`.

---

## 2. Product vision (unchanged idea, raised bar)

**Civita** is a civic issue tracker. Residents report local problems (potholes, broken streetlights,
waste, water leaks) with photos and a map pin. The community upvotes and discusses them. Authorities
triage, assign, and resolve them, and everyone sees progress live.

### Roles

- **Resident** reports issues, upvotes, comments, follows issues, and gets notifications.
- **Authority** has everything a resident has, plus a triage board, assignment, status changes with notes, and internal notes.
- **Admin** has everything an authority has, plus user management (roles, deactivate) and category management.

### Feature set

1. **Auth.** Register and login. Short-lived access token plus a refresh token with rotation in an httpOnly cookie. Revocable sessions, a secure password reset (hashed single-use token sent by email), and a profile with avatar.
2. **Report flow.** A multi-step form: details, then a map pin with reverse geocoding, then photos (drag and drop, previews), then review.
3. **Explore.** Filterable issue feed (status, category, search, sort by newest, top, or nearest) with infinite scroll.
4. **Map.** Full-screen vector map (MapLibre + OpenFreeMap) with clustering, category colours, and a preview panel.
5. **Issue page.** Photo gallery, mini map, status timeline, threaded discussion, optimistic upvote and follow.
6. **Real-time.** Socket.IO pushes new comments, status changes, and notifications.
7. **Triage board.** Kanban-style (Open, In progress, Resolved) for authorities, with drag and drop and assignment.
8. **Analytics.** KPIs (open, resolved, median time to resolution), 30-day trend, breakdown by category and status.
9. **Admin.** Users table (search, role change, deactivate) and categories CRUD.
10. **Polish.** Landing page, dark mode, skeletons, empty states, toasts, responsive layout, keyboard-accessible components.

---

## 3. Tech stack

| Layer      | Choice                                                                                                         | Why                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Language   | **TypeScript** (strict) end to end                                                                             | Type safety and shared contracts                  |
| Monorepo   | **npm workspaces**: `apps/api`, `apps/web`, `packages/shared`                                                  | One install, shared Zod schemas                   |
| Validation | **Zod** schemas shared by API and forms                                                                        | One definition for the client and the server      |
| API        | **Node + Express 5**, layered as routes → controllers → services → models                                      | Express 5 has native async error handling         |
| DB         | **MongoDB + Mongoose**: GeoJSON `2dsphere`, text index, separate `Vote` / `Comment` / `IssueEvent` collections | Bounded documents and correct counters            |
| Auth       | JWT access token (15 min, in memory) plus a rotating refresh token (httpOnly cookie, hashed in DB)             | Industry-standard session model                   |
| Realtime   | **Socket.IO** with JWT handshake and per-issue rooms                                                           | Replaces polling                                  |
| Uploads    | Multer, with Cloudinary when configured and local disk otherwise                                               | Works with zero config                            |
| Logging    | **pino** with request IDs                                                                                      | Structured logs                                   |
| API docs   | OpenAPI generated from the Zod schemas, served with Swagger UI at `/api/docs`                                  | Self-documenting                                  |
| Web        | **React 19 + Vite + React Router**                                                                             | Modern, fast                                      |
| Styling    | **Tailwind CSS v4 + shadcn/ui-style components (Radix primitives)**, lucide icons, motion                      | The design language of Linear, Vercel, and shadcn |
| Data       | **TanStack Query**                                                                                             | Caching, dedup, optimistic updates                |
| Forms      | React Hook Form + Zod resolver                                                                                 |                                                   |
| Maps       | MapLibre GL + react-map-gl + OpenFreeMap tiles (no API key)                                                    | Vector maps that look good                        |
| Charts     | Recharts                                                                                                       |                                                   |
| Testing    | **Vitest + Supertest + mongodb-memory-server** (API), Vitest + Testing Library (web), **Playwright** (E2E)     |                                                   |
| Quality    | ESLint (flat config) + Prettier + `tsc --noEmit`                                                               |                                                   |
| DevOps     | Dockerfiles + `docker-compose.yml`, **GitHub Actions CI** (lint, typecheck, test, build)                       |                                                   |

Design references: shadcn/ui, Linear, Vercel dashboard, Magic UI and Aceternity (hero effects),
Tailwind UI layout patterns.

---

## 4. Data model

```
User          { name, email (unique), passwordHash, role, avatarUrl, bio, isActive, lastSeenAt }
Session       { user, tokenHash, userAgent, ip, expiresAt, revokedAt }   // refresh tokens
PasswordReset { user, tokenHash, expiresAt, usedAt }
Category      { slug, name, description, icon, color, isActive, order }
Issue         { title, description, category, status, priority, location: GeoJSON Point,
                address, images[], reporter, assignee, upvoteCount, commentCount,
                followerCount, resolvedAt }                 // counters only, no unbounded arrays
Vote          { issue, user }            unique(issue, user)
Follow        { issue, user }            unique(issue, user)
Comment       { issue, author, body, isInternal, editedAt }
IssueEvent    { issue, actor, type: created|status_changed|assigned|commented, from, to, note }
Notification  { recipient, actor, issue, type, message, readAt }
```

## 5. API surface (`/api/v1`)

```
auth:     POST register | login | refresh | logout | forgot-password | reset-password ; GET me
users:    PATCH me ; GET /:id ; admin: GET / ; PATCH /:id (role, isActive)
issues:   GET / (filters, cursor) ; GET /map ; GET /:id ; POST / ; PATCH /:id ; DELETE /:id
          POST|DELETE /:id/vote ; POST|DELETE /:id/follow ; PATCH /:id/status ; PATCH /:id/assign
          GET /:id/timeline ; GET|POST /:id/comments ; DELETE /comments/:id
categories: GET / ; admin: POST / ; PATCH /:id ; DELETE /:id
notifications: GET / ; GET /unread-count ; PATCH /:id/read ; PATCH /read-all
analytics: GET /overview (authority+)
uploads:  POST /images
geo:      GET /reverse?lat&lng (proxied Nominatim, cached)
```

## 6. Milestones

1. Monorepo scaffold, tooling, shared schemas
2. API: config, models, auth, issues, social features, notifications, realtime, analytics, docs
3. API test suite
4. Web: design system and app shell, landing page, auth
5. Web: explore feed, map, issue page, report flow
6. Web: notifications, profile, triage board, analytics, admin
7. Seed data (Khulna, Bangladesh), E2E tests, screenshots
8. Docker, CI, README, LICENSE; publish to GitHub
