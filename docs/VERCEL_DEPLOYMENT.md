# Vercel Frontend Deployment

Vercel hosts the JarvisAI Next.js frontend. The Django/Channels backend must be deployed separately because it owns REST APIs, WebSockets, PostgreSQL access, and Redis integration.

## Before Deploying

Deploy the backend first and confirm:

```text
https://<backend-host>/api/health/
wss://<backend-host>/ws
```

The health endpoint should return:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "cache": "ok"
  }
}
```

## Create The Vercel Project

Import the GitHub repository into Vercel and use:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
Output Directory: leave empty
```

## Add Environment Variables

Add these values for Production, Preview, and Development as appropriate:

```text
NEXT_PUBLIC_API_BASE_URL=https://<backend-host>/api
NEXT_PUBLIC_WS_BASE_URL=wss://<backend-host>/ws
```

Do not add database passwords, Redis URLs, Django secrets, OpenAI keys, or OpenRouter keys to Vercel. Those belong to the backend environment.

## Backend Allowlist

After Vercel provides the frontend URL, set these backend values and redeploy the backend:

```text
DJANGO_CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
DJANGO_CSRF_TRUSTED_ORIGINS=https://<vercel-project>.vercel.app
```

If you add a custom domain, include that origin too.

## Verify

1. Open the Vercel URL.
2. Register or sign in.
3. Create a conversation.
4. Create and apply a prompt.
5. Send a message and confirm the assistant response streams.
6. Refresh the page and confirm conversation history remains.
