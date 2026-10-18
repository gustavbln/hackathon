import { SupplierDetail } from "@/components/leaderboard/supplier-detail";
import type { ResearchedSupplier } from "@/lib/research/contract";
import { toSupplier } from "@/lib/research/contract";
import { CRITERION_BY_KEY, type Weights } from "@/lib/suppliers/criteria";
import { AgentGrid, SourceChips } from "./agent-grid";

interface ResearchedProfileProps {
  researched: ResearchedSupplier;
  weights: Weights;
  query: string;
}

/** A real company the agents researched: the briefing, the risk picture from evidence, every agent and source. */
export function ResearchedProfile({ researched, weights, query }: ResearchedProfileProps) {
  const supplier = toSupplier(researched);
  const agents = Object.values(researched.agents);
  const scored = agents.filter((agent) => agent?.status === "estimated").length;
  const date = new Date(researched.researchedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-3xl">
        <p className="text-sm text-[var(--blueprint-muted)]">
          {[researched.legalName, researched.country].filter(Boolean).join(" · ")}
          {researched.website && (
            <>
              {" · "}
              <a href={researched.website} target="_blank" rel="noreferrer" className="hover:underline">
                {new URL(researched.website).hostname.replace(/^www\./, "")}
              </a>
            </>
          )}
          {` · researched ${date} · ${researched.sources.length} sources · ${researched.run.seconds} s · $${researched.run.costUsd.toFixed(3)}`}
        </p>
        <p className="mt-3 leading-relaxed">{researched.summary}</p>
        <p className="mt-2 text-xs text-[var(--blueprint-muted)]">
          Estimated from public sources by Nemotron agents, on the dataset&apos;s 0–100 scale. {scored} of {agents.length} researched
          drivers have evidence; the others stay unscored instead of guessed. Not comparable one to one with Siemens&apos; data.
        </p>
      </section>

      <SupplierDetail scores={supplier.scores} weights={weights} query={query} />

      <section aria-labelledby="agents-heading" className="flex flex-col gap-3">
        <h2 id="agents-heading" className="blueprint-label">{agents.length} agents, one per seat risk driver · open one for its report</h2>
        <AgentGrid agents={researched.agents} sources={researched.sources} />
      </section>

      {researched.insights.length > 0 && (
        <section aria-labelledby="insights-heading" className="flex max-w-3xl flex-col gap-3">
          <h2 id="insights-heading" className="blueprint-label">Recent findings</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {researched.insights.map((insight) => (
              <li key={insight.headline} className="flex flex-col gap-1">
                <span>
                  {insight.criterion && <span className="font-medium">{CRITERION_BY_KEY[insight.criterion].label}: </span>}
                  {insight.headline}
                </span>
                <SourceChips ids={insight.sourceIds} sources={researched.sources} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="sources-heading" className="flex max-w-3xl flex-col gap-3">
        <h2 id="sources-heading" className="blueprint-label">Sources</h2>
        <ol className="flex flex-col gap-2 text-xs">
          {researched.sources.map((source) => (
            <li key={source.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
              <span className="font-mono text-[var(--blueprint-muted)]">[{source.id}]</span>
              <span>
                <a href={source.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {source.title}
                </a>
                <span className="text-[var(--blueprint-muted)]">
                  {" · "}
                  {new URL(source.url).hostname.replace(/^www\./, "")}
                  {source.publishedAt ? ` · ${source.publishedAt.slice(0, 10)}` : ""}
                </span>
                <span className="mt-0.5 block italic text-[var(--blueprint-muted)]">“{source.quote}”</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
