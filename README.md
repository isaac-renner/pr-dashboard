# PR Dashboard

Small Bun server + static UI that lists open GitHub PRs for the current user, with Jira links, CI status, mergeability, and OpenCode session correlations.

## What it does

- Queries GitHub via `gh api graphql` for PRs you authored or are assigned to.
- Renders a single-page HTML dashboard with filters and manual refresh.
- Optionally pulls OpenCode sessions and correlates them to PRs (by PR number, repo name, or session directory).

## Requirements

- Bun
- GitHub CLI (`gh`) authenticated (`gh auth login`)
- Optional: OpenCode API reachable at `OPENCODE_URL`

## Run locally

```bash
bun run server.ts
```

Server listens on `0.0.0.0:${PORT}` (default `3333`).

## Environment variables

- `PORT`: HTTP port (default `3333`).
- `OPENCODE_URL`: Base URL for OpenCode API (default `http://mentat:9741`).
- `OPENCODE_ENABLED`: Set to `false` to skip OpenCode fetches.
- `GH_TOKEN`: GitHub token used by `gh` (optional if `gh` is already logged in).
- `GH_TOKEN_FILE`: If set, the Nix wrapper loads the token from this file into `GH_TOKEN`.
- `GH_USER`: GitHub login used to detect “missing replies” (default `isaac-renner`).

## API endpoints

- `GET /` -> `index.html`
- `GET /api/prs` -> PRs with optional filters
- `POST /api/refresh` -> force refresh cache

### Filters (`/api/prs` query params)

- `drafts=include` to include draft PRs (default excludes).
- `org=all` to include non-`ailohq` repos (default `ailohq` only).
- `exclude=foo,bar` to remove PRs whose titles contain any keyword.
- `repo=substr` to filter by repo name.

## OpenCode correlation rules

The server correlates root OpenCode sessions (not children) to PRs using:

1. PR number in session title (`PR #123`).
2. Session directory repo name match (e.g. `~/ailo/<repo>`).
3. Repo name mentioned in session title.

Session badges in the UI link to OpenCode sessions and show child session counts.

## Nix flake

Build a runnable package that wraps Bun and `gh`:

```bash
nix build
./result/bin/pr-dashboard
```

Dev shell:

```bash
nix develop
```

## Project files

- `server.ts`: Bun server + GitHub/OpenCode fetch + correlation logic.
- `index.html`: Single-page UI + filters.
- `flake.nix`: Nix packaging and dev shell.

## Notes

- Refresh runs every 2 minutes; manual refresh is available in the UI.
- If GitHub fetch fails, the server keeps last good cache and logs errors.
