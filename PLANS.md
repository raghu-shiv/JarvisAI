# PLANS.md

This file tracks the JarvisAI build roadmap and the current project direction.

## Completed

- Project scaffold
  - Created the `JarvisAI` monorepo with `backend`, `frontend`, Docker files, environment example, and initial README.
- Docker foundation
  - Added Docker Compose for Django/Channels, Next.js, PostgreSQL, and Redis.
  - Backend runs as ASGI through Daphne for WebSocket support.
- JWT auth hardening
  - Added register/login token payloads, refresh rotation, blacklist-backed logout, frontend token refresh, and protected auth flow.
- Conversation history workflow
  - Added lightweight conversation lists, detail message loading, rename, soft-delete archive behavior, WebSocket persistence, and auto-title behavior.
- Chat UI and message-history UX polish
  - Added clearer empty states, conversation search, loading/error states, message status labels, assistant copy action, and retry draft preparation.

## Current Phase

Step 5: streaming UX polish.

Target outcomes:

- Improve WebSocket connection lifecycle feedback.
- Add clearer failed-response recovery behavior.
- Prevent awkward send states while the socket is connecting or closed.
- Add better assistant response finalization behavior after streaming completes.

## Upcoming Phases

- Prompt management
  - Build prompt template CRUD UI and apply-template workflow.
- Redis caching and limits
  - Harden conversation/prompt caching and add simple rate-limit foundations.
- OpenAI provider hardening
  - Improve provider settings, model configuration, error handling, and local mock parity.
- Tests
  - Add focused backend API tests and frontend smoke checks.
- Portfolio polish
  - Add screenshots, architecture notes, deployment docs, and a stronger GitHub-facing README.

## Working Agreement

- Codex works inside `JarvisAI`.
- Codex asks before accessing folders outside `JarvisAI`.
- User runs Docker Compose commands.
- User runs git and GitHub write operations.
- Codex may run source-level checks that do not require Docker Compose.
