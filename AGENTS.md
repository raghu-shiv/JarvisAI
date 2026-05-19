# AGENTS.md

This file defines how Codex and other AI agents should work in the JarvisAI repository.

## Working Boundary

- The project root is `JarvisAI`.
- Agents may read and edit files inside `JarvisAI`.
- Agents must ask the user before reading or editing anything outside `JarvisAI`.
- Secrets, local caches, virtual environments, build output, and dependency folders must not be committed.

## Ownership Rules

- The user owns Docker Compose operations.
- The user owns git commits, pushes, branches, tags, and GitHub repository operations.
- Agents must not run `docker compose` commands.
- Agents must not run `git commit`, `git push`, or GitHub write operations.
- Agents may run non-Docker source checks inside `JarvisAI` when useful, such as frontend builds, Django checks, static searches, and read-only inspection.

## Editing Rules

- Preserve user changes.
- Never reset, checkout, or revert files unless the user explicitly requests it.
- Keep changes focused on the requested build step.
- Prefer existing project patterns over introducing new frameworks or abstractions.
- Avoid writing secrets or machine-specific paths into tracked files.

## Validation

Agents may suggest commands for the user to run when validation requires Docker Compose, migrations, git, or GitHub.

Useful user-run commands:

```powershell
docker compose up --build -d
docker compose exec backend python manage.py migrate
git status
git add .
git commit -m "message"
git push
```

Useful agent-run checks inside `JarvisAI`:

```powershell
cd backend
.\.venv\Scripts\python manage.py check

cd ..\frontend
npm run build
```
