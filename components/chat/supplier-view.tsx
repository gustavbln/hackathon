import { criterionColor } from "@/components/leaderboard/risk-color"
import { RiskFingerprint } from "@/components/leaderboard/risk-fingerprint"
import type { ChatResponse } from "@/lib/chat-contract"
import { CRITERIA, TOTAL_RISK_WEIGHTS } from "@/lib/suppliers/criteria"
import type { Scores } from "@/lib/suppliers/types"

type View = NonNullable<ChatResponse["view"]>
type Metric = View["metrics"][number]
type Supplier = View["suppliers"][number]

const COMPARE_LIMIT = 5
// A fingerprint with only a few wedges says little; below this the "why" bars carry the answer.
const FINGERPRINT_MIN_CRITERIA = 6

const euro = new Intl.NumberFormat("en", { style: "currency", currency: "EUR", notation: "compact" })

function formatValue(value: number, unit: string) {
  if (unit === "EUR") return euro.format(value)
  if (unit === "%") return `${value}%`
  return String(Math.round(value * 10) / 10)
}

const valueOf = (supplier: Supplier, metric: string) => supplier.values.find((fact) => fact.metric === metric)?.value

/** Risk points and percentages share a 0–100 scale; anything else is scaled to the largest value shown. */
function barShare(value: number, metric: Metric, suppliers: Supplier[]) {
  if (metric.unit === "risk points" || metric.unit === "%") return value / 100
  const max = Math.max(...suppliers.map((supplier) => valueOf(supplier, metric.key) ?? 0))
  return max > 0 ? value / max : 0
}

function barColor(value: number, metric: Metric) {
  return metric.unit === "risk points" ? criterionColor(value, "visible") : "var(--blueprint-ink)"
}

function Bar({ share, color }: { share: number; color: string }) {
  return (
    <div className="h-1.5 min-w-0 flex-1 bg-[var(--blueprint-grid)]">
      <div className="h-full" style={{ width: `${Math.max(share, 0.01) * 100}%`, background: color }} />
    </div>
  )
}

export function SupplierView({ view }: { view: View }) {
  const { suppliers } = view
  return (
    <figure className="flex flex-col gap-3 border-t border-[var(--blueprint-rule)] pt-3">
      {suppliers.length === 1 ? (
        <SupplierProfile supplier={suppliers[0]} metrics={view.metrics} />
      ) : suppliers.length <= COMPARE_LIMIT ? (
        <MetricComparison suppliers={suppliers} metrics={view.metrics} />
      ) : (
        <RankedBars view={view} />
      )}
      <figcaption className="blueprint-label">
        {view.source.name} / {suppliers.length} of {view.matchedCount} matches
      </figcaption>
    </figure>
  )
}

/** "Why is it high?": the 18-score fingerprint plus each category's weighted contribution. */
function SupplierProfile({ supplier, metrics }: { supplier: Supplier; metrics: Metric[] }) {
  const scores = Object.fromEntries(
    CRITERIA.map(({ key, column }) => [key, valueOf(supplier, column) ?? null]),
  ) as Scores
  const knownCriteria = Object.values(scores).filter((score) => score !== null).length
  const drivers = supplier.values
    .filter((fact) => fact.contribution !== null)
    .toSorted((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0))
    .slice(0, 6)
  const maxContribution = drivers[0]?.contribution ?? 1
  const label = (key: string) => metrics.find((metric) => metric.key === key)?.label ?? key
  const others = supplier.values.filter((fact) => fact.contribution === null)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {knownCriteria >= FINGERPRINT_MIN_CRITERIA && (
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <RiskFingerprint scores={scores} criteria={[...CRITERIA]} weights={TOTAL_RISK_WEIGHTS} size={112} detailed />
          <span className="blueprint-label">Risk fingerprint</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-2 flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs">{supplier.id}</span>
          {others.length > 0 && (
            <span className="truncate text-xs text-[var(--blueprint-muted)]">
              {others.map((fact) => `${label(fact.metric)} ${formatValue(fact.value, metrics.find((metric) => metric.key === fact.metric)?.unit ?? "")}`).join(" · ")}
            </span>
          )}
        </p>
        {drivers.length > 0 && (
          <>
            <p className="blueprint-label mb-2">Biggest contributions, in risk points</p>
            <ol className="flex flex-col gap-2">
              {drivers.map((fact) => (
                <li key={fact.metric} className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-xs">
                  <span className="truncate">{label(fact.metric)}</span>
                  <Bar share={(fact.contribution ?? 0) / maxContribution} color={criterionColor(fact.value, "visible")} />
                  <span className="w-24 text-right font-mono tabular-nums">
                    {fact.contribution?.toFixed(1)}{" "}
                    <span className="text-[var(--blueprint-muted)]">({fact.value}{fact.level ? `, ${fact.level}` : ""})</span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}

/** Side-by-side bars per metric, best supplier marked. */
function MetricComparison({ suppliers, metrics }: { suppliers: Supplier[]; metrics: Metric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metrics.map((metric) => {
        const values = suppliers.flatMap((supplier) => valueOf(supplier, metric.key) ?? [])
        const best = metric.direction === "lower" ? Math.min(...values) : metric.direction === "higher" ? Math.max(...values) : null
        return (
          <section key={metric.key} className="min-w-0">
            <p className="mb-2 flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium">{metric.label}</span>
              {best !== null && <span className="blueprint-label shrink-0">{metric.direction} is better</span>}
            </p>
            <ol className="flex flex-col gap-1.5">
              {suppliers.map((supplier) => {
                const value = valueOf(supplier, metric.key)
                const isBest = value !== undefined && value === best
                return (
                  <li key={supplier.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-20 shrink-0 font-mono ${isBest ? "" : "text-[var(--blueprint-muted)]"}`}>{supplier.id}</span>
                    {value === undefined ? (
                      <span className="flex-1 text-[var(--blueprint-muted)]">–</span>
                    ) : (
                      <Bar share={barShare(value, metric, suppliers)} color={barColor(value, metric)} />
                    )}
                    <span className={`w-14 shrink-0 text-right font-mono tabular-nums ${isBest ? "font-semibold" : ""}`}>
                      {value === undefined ? "" : formatValue(value, metric.unit)}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

/** Up to 20 suppliers, ranked on the sort metric (or the first metric shown). */
function RankedBars({ view }: { view: View }) {
  const metric = view.metrics.find((candidate) => candidate.key === view.sort?.metric) ?? view.metrics[0]
  if (!metric) return null

  return (
    <div>
      <p className="blueprint-label mb-2">Ranked by {metric.label.toLowerCase()}</p>
      <ol className="flex flex-col gap-1.5">
        {view.suppliers.map((supplier, index) => {
          const value = valueOf(supplier, metric.key)
          return (
            <li key={supplier.id} className="flex items-center gap-2 text-xs">
              <span className="w-5 shrink-0 font-mono text-[10px] text-[var(--blueprint-muted)] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="w-20 shrink-0 font-mono">{supplier.id}</span>
              {value === undefined ? (
                <span className="flex-1 text-[var(--blueprint-muted)]">–</span>
              ) : (
                <Bar share={barShare(value, metric, view.suppliers)} color={barColor(value, metric)} />
              )}
              <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                {value === undefined ? "" : formatValue(value, metric.unit)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
