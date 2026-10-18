import { CheckIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import type { ChatStep, ModelCall } from "@/lib/chat-contract"

import type { ChatTrace } from "./types"

const SOURCE_LABEL: Record<ChatStep["source"], string> = { dataset: "dataset", research: "research", tavily: "Tavily", nemotron: "Nemotron" }
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 3 })
const tokens = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`

/** "nvidia/Nemotron-3-Ultra-550b-a55b" reads "Ultra". */
export function modelName(model: string) {
  const name = /super-vl|ultra|super|lightning|nano/i.exec(model)?.[0]
  return name ? name[0].toUpperCase() + name.slice(1) : model
}

/** The models a step ran on, with "thinking" when they reasoned; otherwise where its facts came from. */
function stepBadge({ calls, source }: ChatStep) {
  if (calls.length === 0) return SOURCE_LABEL[source]
  const names = [...new Set(calls.map(({ model }) => modelName(model)))].join(" + ")
  const thinking = calls.some(({ reasoningTokens }) => reasoningTokens > 0) ? " · thinking" : ""
  return `${names}${calls.length > 1 ? ` ×${calls.length}` : ""}${thinking}`
}

export function StepLines({ steps }: { steps: ChatStep[] }) {
  return steps.map((step) => (
    <TraceLine key={step.id} status={step.status === "done" ? undefined : step.status} className="text-xs">
      <TraceIcon>{step.status === "running" ? <Spinner /> : step.status === "done" ? <CheckIcon /> : <XIcon />}</TraceIcon>
      <TraceTitle>{step.label}</TraceTitle>
      <Badge variant="outline" className="h-4 rounded-sm border-[var(--blueprint-rule)] px-1.5 font-mono text-[10px] font-normal tracking-[0.06em] text-[var(--blueprint-muted)] uppercase">
        {stepBadge(step)}
      </Badge>
      {step.ms !== null && <TraceDescription className="text-[var(--blueprint-muted)]">{seconds(step.ms)}</TraceDescription>}
    </TraceLine>
  ))
}

/** One answer's work, collapsed to "4 steps · 9.2 s · $0.019"; it opens into the steps and the cost receipt. */
export function TraceSummary({ trace }: { trace: ChatTrace }) {
  const calls = trace.steps.flatMap((step) => step.calls)
  const cost = calls.reduce((sum, call) => sum + call.costUsd, 0)
  const credits = trace.steps.reduce((sum, step) => sum + step.credits, 0)
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger className="text-xs text-[var(--blueprint-muted)] hover:text-[var(--blueprint-ink)]">
        {trace.steps.length} steps · {seconds(trace.elapsedMs)} · {usd.format(cost)}
        {credits > 0 && ` · ${credits} ${credits === 1 ? "credit" : "credits"}`}
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-3 border-[var(--blueprint-rule)]">
        <Trace className="gap-1">
          <StepLines steps={trace.steps} />
        </Trace>
        <CostReceipt calls={calls} credits={credits} />
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

/** What the answer cost per model, from the usage Nebius reported. */
function CostReceipt({ calls, credits }: { calls: ModelCall[]; credits: number }) {
  const rows = Object.values(Object.groupBy(calls, ({ model }) => modelName(model))).flatMap((group) => {
    const first = group?.[0]
    if (!group || !first) return []
    const sum = (pick: (call: ModelCall) => number) => group.reduce((total, call) => total + pick(call), 0)
    return [{
      name: modelName(first.model), calls: group.length,
      promptTokens: sum((call) => call.promptTokens), completionTokens: sum((call) => call.completionTokens),
      reasoningTokens: sum((call) => call.reasoningTokens), costUsd: sum((call) => call.costUsd),
    }]
  })
  if (rows.length === 0) return null
  return (
    <section aria-label="Cost receipt" className="rounded-sm border border-dashed border-[var(--blueprint-rule)] p-2.5 text-[var(--blueprint-ink)]">
      <p className="blueprint-label mb-1.5">Receipt / NVIDIA Nemotron on Nebius</p>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-[var(--blueprint-muted)]">
            <th scope="col" className="pb-1 font-normal">Model</th>
            <th scope="col" className="pb-1 text-right font-normal">Calls</th>
            <th scope="col" className="pb-1 text-right font-normal">
              <abbr title="Prompt tokens in / completion tokens out, reasoning tokens in brackets">Tokens</abbr>
            </th>
            <th scope="col" className="pb-1 text-right font-normal">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[var(--blueprint-rule)]">
              <th scope="row" className="py-1 text-left font-normal">{row.name}</th>
              <td className="py-1 text-right">{row.calls}</td>
              <td className="py-1 text-right font-mono">
                {tokens.format(row.promptTokens)} / {tokens.format(row.completionTokens)}
                {row.reasoningTokens > 0 && ` (${tokens.format(row.reasoningTokens)})`}
              </td>
              <td className="py-1 text-right font-mono">{usd.format(row.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {credits > 0 && <p className="mt-1.5 text-xs text-[var(--blueprint-muted)]">{credits} Tavily {credits === 1 ? "credit" : "credits"}</p>}
    </section>
  )
}
