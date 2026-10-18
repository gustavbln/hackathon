# hackathon

`cp .env.example .env`, add your Nebius key and Nemotron model ID, `docker compose up`, then open http://localhost:3000.
Team rules: [AGENTS.md](AGENTS.md).

If another checkout already uses port 3000, run
`docker compose -f compose.yaml -f compose.preview.yaml up --build -d` and open http://localhost:3001.
This preview has separate dependency and Next.js cache volumes so the checkouts cannot overwrite each other's installs.

Scroll down on the landing page to zoom toward the passenger carriage and enter `/cabin`.
Scrolling back reverses the zoom; a keyboard entry link appears on focus. The cabin has
40 clickable seats, upholstered cushions, overhead luggage racks, reading lights and transparent
windows overlooking a stylised countryside. Drag to look around and outside
from a fixed position; scroll, pinch or use the zoom buttons to zoom. Reset view returns to the aisle.
With the panorama focused, arrow keys look around and +/- zoom. Click/tap a seat or use the
keyboard-accessible seat selector to highlight it.
The interior is a stylised original, informed by [DB’s ICE 4 overview](https://www.bahn.de/service/ueber-uns/zugtypen/ice-4), not an exact vehicle replica.
Selecting a seat lifts the original chair into the left preview as the cabin fades and its
top-20 shortlist slides in. One canvas stays mounted through selection and return.
The priorities use three averaged Nemotron evaluations. Windows, the door and flooring open clearly labelled previews.
The selected seat floats and rotates on the left while sourcing criteria and suppliers take the
main panel on the right. Click the model or use Enter to pause rotation; reduced-motion preferences are respected.
The selected view has one **Back to cabin** action in the page header, with no seat dropdown or extra rotation toolbar.
Open Gauge in the cabin header: on desktop it docks beside the resized workspace; on phones it
fills the screen. Closing and reopening keeps the conversation for the current page session.

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
seats?". Its `seatCriteria` response renders as a compact priorities card with importance bars,
brief reasons, and expandable details for all 18 criteria and all three evaluation scores.

The cabin seat shortlist uses `GET /api/seat-shortlist?source=nemotron` for averaged AI weights.
The API also supports `source=rules` for the shared seat profile. Both return up to 20 suppliers
with their three biggest risk contributions. The typed response is in `lib/seat-shortlist-contract.ts`.

Checks: `docker compose exec web npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
(run each inside the container). Tests use synthetic suppliers; private data is not needed in CI.
