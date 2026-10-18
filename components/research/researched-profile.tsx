import type { ResearchedSupplier, ResearchSource } from "@/lib/research/contract";
import type { Weights } from "@/lib/suppliers/criteria";
import { CitedText, DriverReports } from "./agent-grid";
import { SourceLink } from "./source-viewer";

interface ResearchedProfileProps {
  researched: ResearchedSupplier;
  weights: Weights;
  query: string;
}

/** A real company the agents researched: a cited briefing, every driver's report with its sources, and the sources themselves. */
export function ResearchedProfile({ researched, weights, query }: ResearchedProfileProps) {
  const agents = Object.values(researched.agents);
  const scored = agents.filter((agent) => agent?.status === "estimated").length;
  const pages = byPage(researched.sources);
  const sites = new Set(pages.map(([first]) => hostOf(first.url)));
  const country = researched.country ? new Intl.DisplayNames(["en"], { type: "region" }).of(researched.country) : null;
  const date = new Date(researched.researchedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
  const stats = [
    ["Drivers scored", `${scored} of ${agents.length}`],
    ["Evidence", `${researched.sources.length} quotes · ${sites.size} sites`],
    ["Agents", `${agents.length} on ${researched.run.models.length} Nemotron models`],
    ["Run", `${researched.run.seconds} s · $${researched.run.costUsd.toFixed(3)} · ${date}`],
  ];

  return (
    <div className="flex flex-col gap-12 pb-8">
      <section className="flex flex-col gap-5">
        <p className="text-sm text-[var(--blueprint-muted)]">
          {[researched.legalName, country].filter(Boolean).join(" · ")}
          {researched.website && (
            <>
              {" · "}
              <a href={researched.website} target="_blank" rel="noreferrer" className="hover:underline">
                {hostOf(researched.website)}
              </a>
            </>
          )}
        </p>
        <dl className="grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-sm border border-[var(--blueprint-rule)] bg-[var(--blueprint-rule)] lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-[var(--blueprint-paper)] px-4 py-3">
              <dt className="blueprint-label">{label}</dt>
              <dd className="mt-1 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="briefing-heading" className="flex max-w-3xl flex-col gap-3">
        <h2 id="briefing-heading" className="blueprint-label">Briefing</h2>
        <p className="text-lg leading-relaxed">
          <CitedText text={researched.summary} sources={researched.sources} />
        </p>
      </section>

      <section aria-labelledby="drivers-heading" className="flex flex-col gap-3">
        <h2 id="drivers-heading" className="blueprint-label">Seat risk drivers · one Nemotron agent each · scored first</h2>
        <DriverReports agents={researched.agents} sources={researched.sources} weights={weights} query={query} />
      </section>

      {pages.length > 0 && (
        <section aria-labelledby="sources-heading" className="flex max-w-3xl flex-col gap-4">
          <h2 id="sources-heading" className="blueprint-label">
            Sources · {researched.sources.length} quotes from {pages.length} pages
          </h2>
          <ol className="flex flex-col gap-5 text-sm">
            {pages.map((quotes) => {
              const [first] = quotes;
              return (
                <li key={first.url} className="flex flex-col gap-2">
                  <p>
                    <SourceLink source={first} className="font-medium hover:underline">
                      {first.title}
                    </SourceLink>
                    <span className="text-[var(--blueprint-muted)]">
                      {" · "}
                      {hostOf(first.url)}
                      {first.publishedAt ? ` · ${first.publishedAt.slice(0, 10)}` : ""}
                    </span>
                  </p>
                  <ul className="flex flex-col gap-1.5 border-l border-[var(--blueprint-rule)] pl-3 text-xs">
                    {quotes.map((source) => (
                      <li key={source.id}>
                        <SourceLink source={source} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-1 text-[var(--blueprint-muted)] hover:text-[var(--blueprint-ink)]">
                          <span className="font-mono">[{source.id}]</span>
                          <span className="italic">“{source.quote}”</span>
                        </SourceLink>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <p className="max-w-3xl text-xs text-[var(--blueprint-muted)]">
        Estimated from public sources by NVIDIA Nemotron agents, on the dataset&apos;s 0–100 scale. Every quote was checked to
        appear word for word on its page. Drivers without evidence stay unscored instead of guessed. Not comparable one to one
        with Siemens&apos; data.
      </p>
    </div>
  );
}

/** Sources grouped by page, in citation order: one page often backs several quotes. */
function byPage(sources: ResearchSource[]): [ResearchSource, ...ResearchSource[]][] {
  const pages = new Map<string, [ResearchSource, ...ResearchSource[]]>();
  for (const source of sources) {
    const page = pages.get(source.url);
    if (page) page.push(source);
    else pages.set(source.url, [source]);
  }
  return [...pages.values()];
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
