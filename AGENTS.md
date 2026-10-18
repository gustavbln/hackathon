# AGENTS.md

Hackathon repo. 3 people, everyone (and every agent) commits straight to `main`.

## How we're judged

- 50% technical execution: it really works, end to end, on the real dataset. Judges get the repo.
- 30% wow effect and creativity: great UI/UX is our edge, so it stays priority one.
- 20% how well it addresses the Siemens track challenge (below).
- NVIDIA side challenge: we qualify by using Nemotron, so every AI feature runs on Nemotron (below).

Before each task, ask which of these it moves. None? Skip it.

## Hand-in

1. Repo access with all code and data. The README is the jury's first look: what it does, our core
   achievements, the architecture at a glance, how to run it.
2. A 2-minute screen recording. Build toward that story: what isn't in the video barely counts.
3. A live deployed app link, plus login credentials for the jury. Hosting: TBD.

Deadline: TBD

Video focus: one component, done really well end to end, including real suppliers outside the
dataset. Component: seats on a high-speed train, with the real seat suppliers and how their
company groups connect (parents, subsidiaries).

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
   source links. Search: Tavily (we have 8,000 credits, key `TAVILY_API_KEY`).
4. Surprise us (our wow points), e.g. multi-agent workflows, generated UIs for chat answers,
   auto-generated shortlist memos.

What the Siemens stakeholder told us (our talk, 2026-10-18):

- **Who it's for:** Siemens procurement buys this risk dataset from a data provider, which has
  special contracts and buys from other data vendors. Their real ask: present it beautifully, in a
  UI that supports decisions, and show them how others would do it. "Anyone vibe-codes a mid-quality
  UI in an hour. A really good UI is hard, and the difference shows."
- **Chatbot is a must:** buyers ask questions about the dataset. One chat can cover both CSV
  questions and real-company research inside the UI; label the source of each answer. Never infer
  real identities for anonymized suppliers.
- **The research agent is the real agentic use case:** "We only have fake data. I'd love real data.
  Can an agent get it?" A crawler that connects data about real companies, with traceable, reliable
  sources. Narrowing is fine (e.g. only German public sources, only environmental data). Nobody is
  expected to match the bought dataset; the agent supplements it.
- **Their biggest concrete pain point, company groups:** suppliers belong to groups of legal
  entities (parents, subsidiaries: legal and business ties, not the supply chain). If 18 of 20
  companies in a group already had a credit default, buying from the other 2 must raise an alarm.
  Siemens pays a separate provider for this graph; public options like North Data are paid. An
  agent that builds the group graph and flags group-wide risk hits their problem exactly.
- **Real component, real suppliers:** taking one part (e.g. brakes) and researching its real
  suppliers is ideal. Technical depth earns extra points, but what counts is how much we get out.
  Small companies with no public data are fine.
- **How they judge:** 2–4 jurors, about 10 teams in about 2 hours. They watch the video, maybe click
  the live app while it plays, maybe point an AI agent at the repo. So: core achievements stated
  crisply, a README that gives an instant overview and shows clean infrastructure (a Nebius juror
  looks at infra), and a live app that works without explanation.

Data:

- `data/supplier_risk_dataset.csv`, 10,000 anonymized suppliers, 46 columns. Column meanings:
  `data/risk_criteria_description.md`. Not in git while the repo is public: copy both files from
  the hackathon materials into `data/`.
- 18 risk scores plus `Total_Risk_Index`, all from 0 (no risk) to 100 (max risk), each with a
  `_Level` column: Low 0–24, Medium 25–49, High 50–74, Critical 75–100.
- `Total_Risk_Index` is exactly the sum of weight × score (verified, R² 0.9996, rounding only):
  Financial Health, Operational Resilience, Quality 0.10; Compliance 0.08; Sub-Tier Visibility,
  Safety Incident, Credit Rating 0.06; ESG, Governance, Geopolitical 0.05; Industry Benchmark,
  Labor Stability, Environmental, Digital Security, Political 0.04; Media Sentiment, External
  Intelligence, Market Sentiment 0.03. So "why is it high" has an exact answer.
- `Safety_Incident_Score` counts workplace accidents at the supplier, not product safety. Product
  safety shows up in Quality and Compliance.
- 911 of the 4,803 suppliers rated Low/Medium overall (19%) hide at least one Critical sub-score.
- Operational columns: `Purchase Order Volume (EUR)` (our exposure), `Order Change Rate`,
  `Supplier Delivery Rating`, `Order Confirmation Rate` (all 0–100%), `Sourcing Risk Level`
  (Low/Medium/High: how hard to replace), `Supply Chain Complexity` (Simple/Moderate/Complex).
- Careful: delivery rating and confirmation rate are good when high, unlike the risk scores.

## Nemotron (NVIDIA side challenge)

- Provider: [Nebius Token Factory](https://tokenfactory.nebius.com/), OpenAI-compatible. Base URL
  `https://api.tokenfactory.nebius.com/v1/`, key in `NEBIUS_API_KEY`, model ID in `NEBIUS_MODEL`.
  Server-side only, never from the browser. One client in `lib/`, reused by the chatbot and agents.
- Model: `nvidia/Nemotron-3-Ultra-550b-a55b`, verified against Nebius's authenticated `/v1/models`
  endpoint on 2026-10-18. Use Nebius for all LLM calls, with no automatic provider fallback.
- Show it: the UI and the video make clear the AI runs on NVIDIA Nemotron.
- Verify Nebius's supported reasoning and tool parameters before using them; don't assume NVIDIA's
  request options transfer unchanged. Reasoning text is separate from the answer.

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

Split by folder so we rarely touch the same files.

- Frontend owner: all pages and components, including chat, app shell, 3D train, explore and compare.
- Dennis, chatbot functionality: `app/api/chat/` and shared server-side data, tools and Nemotron calls
  in `lib/`. Return typed data for supplier cards, comparisons and charts; leave frontend work to its owner.
- Gustav, supplier benchmark and real suppliers: `app/suppliers/`, `components/leaderboard/`,
  `lib/market/`. Ranking for the chosen component, a focus panel per supplier (risk fingerprint,
  exact "why" breakdown, watch-outs, alternative risk profiles) and a top-20 matrix where only high
  and critical scores are coloured.

`lib/` holds data access, scoring and tool functions: one source of truth that the UI, the chatbot
and the agents all call. `lib/suppliers/` is the dataset foundation: `criteria.ts` (the 18 criteria
with their exact weights), `dataset.ts` (rows from the shared loader in `lib/suppliers.ts`, keyed by criterion), `profiles.ts`
(weights per component, each boost with its reason) and `scoring.ts` (profile risk, ranking, "why"
contributions, alternatives). Shared files (`lib/`, `app/layout.tsx`, `app/globals.css`, `components/ui/`,
`package.json`): small changes only, tell the team.

Chat backend: `POST /api/chat`; request/response types and schemas in `lib/chat-contract.ts`.
Uses `zod`, `csv-parse`, `server-only`; focused backend checks run with `npm test` in Docker.
Seat preferences: `POST /api/seat-criteria` runs Nemotron three times and averages criterion
importance. Frontend contract: `lib/seat-criteria-contract.ts`. AI suggestions, not engineering validation.
Chat tool `evaluate_seat_criteria` reuses it; `/api/chat` may return optional `seatCriteria` data.

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

## 3D train (Yogos)

- Landing asset: original procedural high-speed train in `public/models/high-speed-train.glb`.
  Source: `components/train/create-train.ts`; regenerate with
  `docker compose exec web node --experimental-strip-types scripts/export-train.mjs`.
  Blueprint colors live in `app/globals.css` (`--train-*`) and are baked into the export.
- Model: [ICE-3 by J-m@n](https://3dwarehouse.sketchup.com/model/e6593c7243820ab45bef0d098ed74c1d/ICE-3),
  the real ICE 3/Velaro shape. GLB, 5.6 MB, 126k triangles, 4 cars. Units are inches: scale by 0.0254.
- Licence (3D Warehouse General Model License): fine inside our app, never offered as a standalone
  download. Commit the GLB only once the repo is private. Credit "ICE-3 by J-m@n, 3D Warehouse" in
  the README and the video. No DB logos.
- Clickable meshes: bogies, wheelsets, pantograph, windows (the groups are unnamed, so name them
  once). Doors, brakes, coupler, HVAC and interior become hotspot markers at 3D positions.
- Look: "Tony Stark" blueprint. Edge lines and a soft glow, each part coloured by its supplier risk,
  smooth fly-to on click, hover callouts. Mobbin refs: Zillow 3D Home (hotspots plus side panel),
  Magnific 3D viewer.
- Installed 3D dependencies: `three`, `@react-three/fiber@9`,
  `@react-three/drei` (`CameraControls`, `Html`, `Edges`), `@react-three/postprocessing` (glow, off
  on phones), plus `@types/three` for TypeScript. Load the canvas client-side only
  (`next/dynamic` with `ssr: false`).
- Fallbacks: the [CC-BY ICE by gritsayilia](https://sketchfab.com/3d-models/ice-train-5718ef1a24f34e709bd6e35b7ada27b4)
  with hotspots, or a stylised ICE built from three.js shapes. Detail zoom:
  [Passenger Coach Bogie](https://sketchfab.com/3d-models/passenger-coach-bogie-99d906d4ec8e4b7293e560e08a4c84d8) (CC-BY-SA).

## Code quality (guardrail: judges read the repo)

It must read like a senior team built it, not like it was vibe coded.

- Real data and real Nemotron calls wherever the demo shows them. No fake results.
- One way to do each thing: data access, scoring and LLM calls live in `lib/` and get reused, never
  copied into components or routes.
- TypeScript strict: no `any`, no `@ts-ignore`, no `!` to silence errors. Types are defined once,
  next to the data they describe.
- Validate everything from outside at the boundary (request bodies, LLM tool arguments, API
  responses) with a schema (zod).
- Server-only code (Nemotron calls, keys, the CSV) starts with `import "server-only"`.
- Small focused files and functions, names that say what they do. Comments explain why, never
  narrate what. No dead code, commented-out code, stray `console.log` or leftover TODOs.
- No swallowed errors: every async UI has loading, empty and error states.
- Core logic (scoring, ranking, tool functions, memo checks) gets focused tests. No tests for markup.
- Simplest design that works: no abstraction for a single use, no new dependency for a few lines.
- Secrets go in `.env` (gitignored). List the variable names in `.env.example`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck and build on every push to `main`. Red CI:
  fix it before anything else.

## Agents

- Read this file first; re-read it after `git pull`, teammates edit it.
- Run every `npm`, `npx` and `node` command as `docker compose exec web <cmd>`, never on the host.
  Container not running? `docker compose up -d`.
- Before committing: `lint` and `typecheck` pass.
- Stay in your human's area.
- Commit and push each working step, unless your human says otherwise.
- Commit messages: `feat: …`, `fix: …`, `chore: …`, short and specific.
- The Next.js docs below live in the container: `docker compose exec web ls node_modules/next/dist/docs`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
