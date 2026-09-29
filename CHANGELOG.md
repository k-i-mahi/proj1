# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-09-29

A ground-up rewrite of Civita as a TypeScript monorepo.

### Added

- Map-first, four-step issue reporting with place search, GPS, reverse geocoding and
  in-browser image compression.
- Real-time comments, upvotes, status changes and notifications over Socket.IO.
- Drag-and-drop triage board, staff assignment, public status notes and internal notes.
- Analytics dashboard: resolution rate, median time to resolve, trends, category and
  status breakdowns.
- Admin screens for users (roles, deactivation) and categories.
- Command palette (Ctrl/Cmd + K), dark mode, responsive layout and accessible Radix UI components.
- OpenAPI documentation generated from shared Zod schemas at `/api/docs`.
- Test suites: API integration tests, web unit tests and Playwright end-to-end tests.
- Docker images, docker-compose stack and GitHub Actions CI and release workflows.

### Changed

- Authentication now uses short-lived access tokens and rotating, hashed refresh tokens
  in httpOnly cookies, with reuse detection.
- Votes, follows, comments and status history moved into dedicated collections with
  atomic counters.

### Security

- Fixed the v1 password reset flow, which returned the reset token in the API response
  and allowed account takeover. Reset tokens are now random, hashed, single-use,
  emailed, and expire after 30 minutes.

## [1.0.0] - 2025-10-26

- Original university project (Create React App + Express, JavaScript).

[2.0.0]: https://github.com/k-i-mahi/proj1/compare/d7ca7cf...v2.0.0
[1.0.0]: https://github.com/k-i-mahi/proj1/tree/legacy-v1
