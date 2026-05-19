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

## Current Phase

Step 4: chat UI and message-history UX polish.

Target outcomes:

- Clear empty states for first use, no selected conversation, and empty selected conversation.
- Conversation search/filter in the sidebar.
- Loading and error states for conversation and message requests.
- Better message status display for streaming and failed responses.
- Copy action for assistant messages.
- Retry UX placeholder, with backend retry support deferred until the streaming phase if needed.

## Upcoming Phases

- Streaming UX polish
  - Improve stream lifecycle states, failed-response handling, and user feedback.
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
