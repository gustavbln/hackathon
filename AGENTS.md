# AGENTS.md

Hackathon repo. 3 people, everyone (and every agent) commits straight to `main`.
Priority one: great UI/UX. Priority two: it works in the demo. Clean code comes last.

## Project

- Idea: TBD
- Stack: Next.js 16 (App Router, TypeScript), Tailwind v4, shadcn/ui (Radix, nova preset)
- Run: `docker compose up` → http://localhost:3000

Fill in the idea as soon as it's decided. Keep this file short.

## Docker only

Nobody installs dependencies or runs `npm`, `npx` or `node` on their machine. Everything runs in the
`web` container. The repo is mounted into it, so edits on your machine hot-reload instantly.
`node_modules` and `.next` live in Docker volumes.

    docker compose up                             # start: installs deps, dev server on :3000
    docker compose exec web npm install <pkg>     # add a package
    docker compose exec web npm install           # after a pull that changed package.json
    docker compose exec web npm run lint          # also: typecheck, build
    docker compose exec web sh                    # shell in the container
    docker compose down -v && docker compose up   # deps broken: wipe node_modules and .next

Editor types and autocomplete need `node_modules`, which only exists in the container: open the repo
in the dev container (VS Code/Cursor: "Reopen in Container").

## Who owns what

Split by route folder (`app/<feature>/`) so we rarely touch the same files.

- Person 1: TBD
- Person 2: TBD
- Person 3: TBD

Shared files (`app/layout.tsx`, `app/globals.css`, `components/ui/`, `package.json`): small changes
only, tell the team.

## Git on a shared main

Once per clone:

    git config pull.rebase true
    git config rebase.autoStash true

Every change:

1. `git pull`
2. Small change, check it runs
3. `git add <files>` → `git commit` → `git pull` → `git push`
4. Push rejected? `git pull`, fix conflicts, push again

Rules:

- `main` always runs. Pushed something broken? Fix it now or `git revert <sha>`.
- Never force-push or rewrite pushed history.
- Never throw away changes you didn't make (`reset --hard`, `checkout .`, `clean`, `stash drop`).
- Stage files by name, not `git add -A`.
- Conflicts: keep both sides' intent; unsure, ask. Lockfile conflict: take theirs, then
  `docker compose exec web npm install`.
- Don't reformat, rename or move files you aren't working on.
- New dependency, env var, or shared shape (API, schema): tell the team, note it here.

## UI/UX

- Before building a new screen, flow or section, look it up on Mobbin (MCP: `search_screens`,
  `search_flows`, `search_sections`). Pick a reference, build from it, and show your human the link.
- Every shadcn component is already in `components/ui/`. Use them, no other UI library.
  Icons: `lucide-react`. Usage: `docker compose exec web npx shadcn docs <component>`.
- One theme for everyone: CSS variables in `app/globals.css`. Don't set colors per component.
- Tooltips and toasts (`toast()` from `sonner`) are already wired up in `app/layout.tsx`.
- Every screen needs loading, empty and error states, and must work on a phone-sized viewport.
- Look at it in the browser before calling it done.

Each person connects the Mobbin MCP in their own agent. It does not go into this repo.

## Code

- UI polish aside, the simplest thing that works. Hardcoding, mocks and fake data are fine.
- No tests unless something keeps breaking the demo.
- Secrets go in `.env` (gitignored). List the variable names in `.env.example`.

## Agents

- Read this file first; re-read it after `git pull`, teammates edit it.
- Run every `npm`, `npx` and `node` command as `docker compose exec web <cmd>`, never on the host.
  Container not running? `docker compose up -d`.
- Before committing: `lint` and `typecheck` pass.
- Stay in your human's area.
- Commit and push each working step, unless your human says otherwise.
- Commit messages: short, what changed.
- The Next.js docs below live in the container: `docker compose exec web ls node_modules/next/dist/docs`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
