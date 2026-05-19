# JarvisAI

JarvisAI is an enterprise-style AI chat platform built with Next.js, Django REST Framework, Django Channels, Redis, PostgreSQL, and Docker.

The goal of this repository is to demonstrate production-minded full-stack engineering: authenticated users can manage conversations, stream AI responses over WebSockets, preserve message history, apply reusable prompt templates, and run the full stack locally with Docker Compose.

## Current Status

Implemented:

- Next.js App Router frontend with TypeScript and Tailwind CSS
- Django REST Framework API backend
- Django Channels WebSocket backend running through Daphne
- Docker Compose foundation for frontend, backend, PostgreSQL, and Redis
- JWT registration, login, refresh, logout, refresh rotation, and token blacklist support
- Protected frontend auth flow with access-token refresh on `401`
- Conversation list/detail APIs with lightweight list responses
- Message history loading and markdown rendering
- Conversation rename, soft archive/delete, search/filter, and auto-title behavior
- Streaming chat over WebSockets with connection lifecycle feedback
- Streaming, completed, failed, rate-limited, and provider-error UI states
- Assistant message copy action and retry draft preparation
- Prompt template CRUD UI
- Apply prompt templates to conversations as persisted system messages
- Redis-backed conversation and prompt ID-list caching
- Per-user WebSocket chat request throttling
- Mock AI provider for local demos without paid keys
- OpenAI provider foundation with configurable model, temperature, max tokens, and timeout
- Assistant message provider/model metadata persistence
- Sanitized AI provider errors
- Project governance docs in `AGENTS.md`, `PLANS.md`, and `.codex/`

In progress / next:

- Focused backend and provider tests
- Lightweight frontend smoke coverage
- Portfolio polish: screenshots, architecture notes, deployment guide, and richer README visuals

## Architecture

```text
Next.js frontend
  | REST: auth, conversations, messages, prompts
  | WebSocket: streaming chat
  v
Django + DRF + Channels + Daphne
  | PostgreSQL: users, conversations, messages, prompts
  | Redis: Channels layer, cache, rate limits
  v
Mock provider / OpenAI provider
```

## Tech Stack

Frontend:

- Next.js App Router
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
- OpenAI provider for real completions
- Configurable provider/model settings through environment variables

## Local Setup

Copy the environment file:

```bash
cp .env.example .env
```

Start the stack:

```bash
docker compose up --build -d
```

Run migrations:

```bash
docker compose exec backend python manage.py migrate
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

By default `AI_PROVIDER=mock`, so the app works locally without an OpenAI API key.

## Environment Configuration

Core service variables:

```text
POSTGRES_DB=jarvis
POSTGRES_USER=jarvis
POSTGRES_PASSWORD=jarvis
POSTGRES_HOST=db
POSTGRES_PORT=5432
REDIS_URL=redis://redis:6379/0
```

Django/frontend variables:

```text
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000/ws
```

AI provider variables:

```text
AI_PROVIDER=mock
MOCK_AI_MODEL=mock-jarvis-v1
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=0
OPENAI_TIMEOUT_SECONDS=30
```

Rate-limit variables:

```text
CHAT_RATE_LIMIT_COUNT=20
CHAT_RATE_LIMIT_WINDOW_SECONDS=60
```

Use `AI_PROVIDER=openai` only when `OPENAI_API_KEY` is configured in your local or deployment environment.

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
POST   /api/conversations/:id/apply_prompt/
```

Prompts:

```text
GET    /api/prompts/
POST   /api/prompts/
GET    /api/prompts/:id/
PATCH  /api/prompts/:id/
DELETE /api/prompts/:id/
```

WebSocket:

```text
ws://localhost:8000/ws/chat/:conversation_id/?token=<access_token>
```

Client-to-server chat event:

```json
{
  "type": "user.message",
  "content": "Explain this architecture."
}
```

Server-to-client event types:

```text
connection.ready
assistant.started
assistant.delta
assistant.completed
assistant.failed
rate_limited
error
```

## Redis Usage

Redis is used for:

- Django Channels layer
- Django cache backend
- Per-user conversation ID-list caching
- Per-user prompt ID-list caching
- Per-user WebSocket chat request throttling

Message contents are persisted in PostgreSQL and are not cached as a Redis optimization.

## Development Workflow

Source checks:

```bash
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run

cd ../frontend
npm run build
```

Useful service checks:

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose logs redis
```

## Project Governance

- `AGENTS.md` defines AI-agent operating rules for this repository.
- `PLANS.md` tracks completed and upcoming build phases.
- `.codex/` contains project-local Codex guidance.
- The user owns Docker Compose, git, and GitHub write operations.
- Codex works inside `JarvisAI` and asks before accessing anything outside the project folder.

## Security Notes

- `.env` is ignored by git.
- `.env.example` documents required variables and uses development-safe placeholders.
- Never commit API keys, tokens, database dumps, virtual environments, `node_modules`, or build output.
- Keep `AI_PROVIDER=mock` for demos and local development without paid provider keys.
