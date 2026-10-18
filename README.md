# hackathon

`cp .env.example .env`, add your Nebius key and Nemotron model ID, `docker compose up`, then open http://localhost:3000.
Team rules: [AGENTS.md](AGENTS.md).

The chat backend uses NVIDIA Nemotron through Nebius. Copy the private hackathon files into
`data/supplier_risk_dataset.csv` and `data/risk_criteria_description.md` (gitignored).
It filters all 10,000 suppliers, ranks or compares up to 20, and explains weighted risk contributions.
No database, vector store or agent framework is required.

Frontend integration: `POST /api/chat` with JSON `{ "message": "Which of SUPP_00012, SUPP_00450 and SUPP_00731 has the lowest financial risk?" }`.
Optional fields: `history` (up to 12 `{role: "user" | "assistant", content}` messages), `selectedIds`
(up to 20), and `lastView` from the previous response. Re-send these for follow-up questions.
The response contains `answer`, `model`, `view`, `lastView` and `tools`; types are in
[`lib/chat-contract.ts`](lib/chat-contract.ts). `view` supplies CSV-backed values, metric labels,
directions, weighted contributions and a dataset fingerprint for cards/charts. It is null for
help or no matches. Errors use `{error: {code, message}}` with a non-2xx status.
The endpoint returns JSON (not a stream); show a pending state and use `AbortController` to cancel.
Real-company web research is a separate feature and is not implemented in this endpoint.

Checks: `docker compose exec web npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
(run each inside the container). Tests use synthetic suppliers; private data is not needed in CI.
