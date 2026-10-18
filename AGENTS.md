# AGENTS.md

Hackathon repo. 3 people, everyone (and every agent) commits straight to `main`.

## How we're judged

- 50% technical execution: it really works, end to end, on the real dataset. Judges get the repo.
- 30% wow effect and creativity: great UI/UX is our edge, so it stays priority one.
- 20% how well it addresses the Siemens track challenge (below).
- NVIDIA side challenge: we qualify by using Nemotron, so every AI feature runs on Nemotron (below).

Before each task, ask which of these it moves. None? Skip it.

## Hand-in

1. Repo access with all code and data. The README says what it does and how to run it.
2. A 2-minute screen recording. Build toward that story: what isn't in the video barely counts.
3. A live deployed app link, plus login credentials for the jury. Hosting: TBD.

Deadline: TBD

## Project

- Idea: the Siemens brief below. Our own twist: TBD
- Stack: Next.js 16 (App Router, TypeScript), Tailwind v4, shadcn/ui (Radix, nova preset)
- Run: `cp .env.example .env`, fill in the keys, `docker compose up` → http://localhost:3000

Fill in the idea and the deadline as soon as they're decided. Keep this file short.

## Siemens track: Smart Supplier Selection for Trains

A train has tens of thousands of parts. Rail buyers pick each supplier from hundreds of options:
on time, top quality, low risk. We build the tool that turns supplier risk data into a decision.

Demo story: a buyer sourcing a critical component narrows the field, compares up to 20 suppliers
side by side and justifies the final choice.

What the brief asks for:

1. UI: filter, rank and compare up to 20 suppliers at once. Beyond tables: risk profiles,
   side-by-side views, *why* a supplier is risky.
2. Chatbot grounded in the data, e.g. "Which of SUPP_00012, SUPP_00450 and SUPP_00731 has the
   lowest financial risk?" or "Why is the Total Risk Index of SUPP_00018 so high?" Grounded means
   the numbers come from the dataset through tool calls, never from the model's memory.
3. Research agent: the buyer names a *real* company. The agent plans its research, crawls news,
   public sources and company sites, digs deeper on red flags, and delivers a risk report with
   source links. Search/crawl API: TBD.
4. Surprise us (our wow points), e.g. multi-agent workflows, generated UIs for chat answers,
   auto-generated shortlist memos.

Data:

- `data/supplier_risk_dataset.csv`, 10,000 anonymized suppliers, 46 columns. Column meanings:
  `data/risk_criteria_description.md`. Not in git while the repo is public: copy both files from
  the hackathon materials into `data/`.
- 19 risk scores from 0 (no risk) to 100 (max risk), each with a `_Level` column
  (Low/Medium/High/Critical). `Total_Risk_Index` is the weighted average.
- Operational columns: `Purchase Order Volume (EUR)` (our exposure), `Order Change Rate`,
  `Supplier Delivery Rating`, `Order Confirmation Rate` (all 0–100%), `Sourcing Risk Level`
  (Low/Medium/High: how hard to replace), `Supply Chain Complexity` (Simple/Moderate/Complex).
- Careful: delivery rating and confirmation rate are good when high, unlike the risk scores.

## Nemotron (NVIDIA side challenge)

- All LLM calls go to NVIDIA's OpenAI-compatible API at `https://integrate.api.nvidia.com/v1`,
  key in `NVIDIA_API_KEY` (get one at build.nvidia.com). Server-side only, never from the browser.
- Models (catalog checked 2026-10-18): `nvidia/nemotron-3-super-120b-a12b` (default),
  `nvidia/nemotron-3.5-lightning-30b-a3b` (fast), `nvidia/nemotron-3-ultra-550b-a55b` (strongest),
  `nvidia/nemotron-3-embed-1b` (embeddings). Live list: `curl https://integrate.api.nvidia.com/v1/models`.
- Show it: the UI and the video make clear the AI runs on NVIDIA Nemotron.

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

- Real data and real Nemotron calls wherever the demo shows them. Judges read the repo: no fake
  results they could spot.
- Otherwise the simplest thing that works, readable over clever.
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
