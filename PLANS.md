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
- Streaming UX polish
  - Added WebSocket connection lifecycle feedback, safer send availability, stream error messaging, and assistant completion finalization.
- Prompt management
  - Added authenticated prompt template CRUD UI, prompt validation, prompt loading/error states, and apply-to-conversation workflow.
- Redis caching and limits
  - Added explicit Redis cache keys, cached conversation/prompt ID lists, cache invalidation on mutations, and per-user WebSocket chat throttling.

## Current Phase

Step 8: OpenAI provider hardening.

Target outcomes:

- Improve provider settings and model configuration.
- Add provider-specific error handling.
- Keep mock provider behavior aligned with the streaming interface.
- Surface provider/model metadata on persisted assistant messages where practical.

## Upcoming Phases

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
