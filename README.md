# JarvisAI

JarvisAI is an enterprise AI chat platform built with Next.js, Django REST Framework, Django Channels, Redis, PostgreSQL, and Docker.

## MVP Scope

- JWT authentication
- Real-time chat over WebSockets
- Streaming assistant responses
- Conversation history
- Prompt template management
- Markdown rendering
- Redis for Channels and caching
- Mock AI provider for local demos
- OpenAI provider for real completions

## Architecture

```text
Next.js frontend
  | REST: auth, conversations, prompts
  | WS: streaming chat
  v
Django + DRF + Channels
  | PostgreSQL: users, conversations, messages, prompts
  | Redis: channel layer, cache
  v
Mock/OpenAI provider
```

## Local Setup

```bash
cp .env.example .env
docker compose up --build
```

Then run migrations in another terminal:

```bash
docker compose exec backend python manage.py migrate
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

By default `AI_PROVIDER=mock`, so the app can run without an API key.
