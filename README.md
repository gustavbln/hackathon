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

Seat criteria: `POST /api/seat-criteria` (no body) makes three separate Nemotron evaluations of
the 18 shared risk criteria. Each scores importance from 0 to 10 with a
short reason. The response gives all three `scores`, their arithmetic `meanImportance`, and
`weightPercent = meanImportance / sum(all mean importances) * 100`, sorted most important first.
All three runs must succeed and include every criterion. No supplier rows are sent to Nebius.
Use [`SeatCriteriaResponse`](lib/seat-criteria-contract.ts) for the frontend side panel; format
weights for display without rounding the stored values. Call once when requested and keep the
response for the sourcing session rather than re-evaluating on every render.
`weights` uses the existing `Weights` shape and sums to 1; pass it directly to `rankSuppliers`
from `lib/suppliers/scoring.ts` for a custom seat risk ranking. Operational metrics
remain separate filters. These are AI-suggested preferences, not validated engineering criteria.
Repeated runs can agree and still be wrong. The endpoint does not alter the original risk index
or supplier ranking automatically.
The chatbot can call this evaluator too: ask "What are the most important criteria for train
seats?". The answer includes the averaged priorities and an optional `seatCriteria` response
field for a future criteria panel. Existing chat rendering displays the answer without changes.

Checks: `docker compose exec web npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
(run each inside the container). Tests use synthetic suppliers; private data is not needed in CI.
