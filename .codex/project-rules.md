# JarvisAI Project Rules

## Scope

Codex may read and edit files inside `JarvisAI`.

Codex must ask before accessing any folder outside `JarvisAI`.

## Command Ownership

The user runs:

- Docker Compose commands
- Database migration commands inside Docker Compose
- Git commits and pushes
- GitHub write operations

Codex must not run:

- `docker compose ...`
- `git commit`
- `git push`
- GitHub repository mutations

Codex may run source-level checks inside the project when useful:

- `npm run build`
- `python manage.py check`
- static searches
- read-only file inspection

## Development Expectations

- Keep changes focused on the active build phase.
- Preserve user changes.
- Do not reset or revert unless explicitly asked.
- Do not write secrets to tracked files.
- Prefer Docker Compose for project services, but leave those commands to the user.
