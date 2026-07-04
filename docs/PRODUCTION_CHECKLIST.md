# Production Checklist

Use this checklist before exposing JarvisAI beyond local development.

## Backend

- Deploy Django Channels behind HTTPS with WebSocket upgrade support.
- Set `DJANGO_DEBUG=false`.
- Use a strong, private `DJANGO_SECRET_KEY`.
- Configure production allowed hosts, CORS origins, and CSRF trusted origins.
- Enable HTTPS redirect, secure cookies, and HSTS after HTTPS is verified.
- Use managed PostgreSQL and Redis instances.
- Run Django migrations.
- Verify `/api/health/`.
- Keep provider secrets in the backend secret store only.
- For OpenRouter, start with `liquid/lfm-2.5-1.2b-instruct:free`; `qwen/qwen3-next-80b-a3b-instruct:free` and `openai/gpt-oss-120b:free` are also configured free options.

## Frontend

- Deploy `frontend` as the Vercel project root.
- Set production `NEXT_PUBLIC_API_BASE_URL`.
- Set production `NEXT_PUBLIC_WS_BASE_URL` with `wss://`.
- Redeploy after changing public environment variables.
- Test login, prompts, streaming, and history reload from the deployed URL.

## Operations

- Review backend console logs after deployment.
- Add uptime monitoring for `/api/health/`.
- Confirm rate limits are appropriate for the deployment tier. JarvisAI does not apply its own chat rate limit when `AI_PROVIDER=openrouter` because the configured OpenRouter models are free.
- Keep `AI_PROVIDER=mock` until the OpenAI or OpenRouter secret is ready.
- Run CI before each release.
