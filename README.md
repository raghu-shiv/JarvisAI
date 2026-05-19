# JarvisAI

JarvisAI is an enterprise AI chat platform built with Next.js, Django REST Framework, Django Channels, Redis, PostgreSQL, and Docker.

The project is designed as a flagship full-stack portfolio repository: authenticated users can manage conversations, send chat messages over WebSockets, stream assistant responses, preserve conversation history, and later manage reusable prompt templates.

## Current Status

Implemented:

- Next.js App Router frontend
- Django REST Framework backend
- Django Channels WebSocket backend
- Docker Compose foundation
- PostgreSQL and Redis services
- JWT registration, login, refresh, and logout
- Refresh-token rotation and blacklist support
- Conversation list/detail APIs
- Message history loading
- Conversation rename and archive/delete
- Conversation search/filter
- Conversation and message loading/error states
- WebSocket response streaming with a mock AI provider
- Message status labels and assistant copy action
- Markdown rendering for messages

Planned:

- Chat UI and message-history UX polish
- Prompt management UI
- Redis caching and rate-limit hardening
- OpenAI provider hardening
- Backend and frontend tests
- Screenshots and deployment documentation

## Architecture

```text
Next.js frontend
  | REST: auth, conversations, messages, prompts
  | WebSocket: streaming chat
  v
Django + DRF + Channels
  | PostgreSQL: users, conversations, messages, prompts
  | Redis: channel layer, cache
  v
Mock/OpenAI provider
```

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Markdown
- Lucide icons

Backend:

- Django
- Django REST Framework
- Django Channels
- Daphne
- SimpleJWT

Infrastructure:

- Docker Compose
- PostgreSQL
- Redis

AI:

- Mock provider for local development and demos
- OpenAI provider foundation for real completions

## Local Setup

Copy the environment file:

```bash
cp .env.example .env
```

User-run Docker command:

```bash
docker compose up --build
```

User-run migration command in another terminal:

```bash
docker compose exec backend python manage.py migrate
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

By default `AI_PROVIDER=mock`, so the app can run without an API key.

## API Overview

Auth:

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
POST /api/auth/token/refresh/
GET  /api/auth/me/
```

Conversations:

```text
GET    /api/conversations/
POST   /api/conversations/
GET    /api/conversations/:id/
PATCH  /api/conversations/:id/
DELETE /api/conversations/:id/
GET    /api/conversations/:id/messages/
```

Prompts:

```text
GET    /api/prompts/
POST   /api/prompts/
PATCH  /api/prompts/:id/
DELETE /api/prompts/:id/
```

WebSocket:

```text
ws://localhost:8000/ws/chat/:conversation_id/?token=<access_token>
```

## Development Workflow

Codex may edit files inside this repository and run source-level checks.

The user owns Docker Compose and git/GitHub operations.

Useful source checks:

```bash
cd backend
python manage.py check

cd ../frontend
npm run build
```

Useful user-run service checks:

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
```

## Environment And Secrets

- `.env` is ignored by git.
- `.env.example` is safe to commit and documents required variables.
- Keep `AI_PROVIDER=mock` for local demos without paid API keys.
- Set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY` only in local or deployment environments.
- Never commit API keys, tokens, database dumps, virtual environments, `node_modules`, or build output.

## Project Governance

- `AGENTS.md` defines agent operating rules.
- `PLANS.md` tracks the build roadmap.
- `.codex/` contains project-local Codex guidance and no secrets.
