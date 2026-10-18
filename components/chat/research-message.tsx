"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react"

import { AgentGrid, SourceChips } from "@/components/research/agent-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace"
import type { ResearchedSupplier } from "@/lib/research/contract"
import { CRITERION_BY_KEY } from "@/lib/suppliers/criteria"

import { assistantName } from "./assistant-avatar"
import { modelName } from "./chat-trace"
import type { ResearchRun } from "./research-run"

/** What the buyer tells the agents; the panel adds the drivers the page weights. */
export type ResearchRequest = { name: string; website: string | null; brief: string }

const fieldClass =
  "rounded-sm border-[var(--blueprint-rule)] bg-transparent text-[var(--blueprint-ink)] placeholder:text-[var(--blueprint-muted)] focus-visible:border-[var(--blueprint-muted)] focus-visible:ring-0 dark:bg-transparent"

/** "kiel-seating.com" becomes "https://kiel-seating.com"; anything that is still no web address is refused. */
function toWebsite(value: string): string | null | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return URL.canParse(url) && new URL(url).hostname.includes(".") ? url : undefined
}

/** The add-supplier intake: a form, so the research starts from exactly what the buyer typed. */
export function ResearchIntake({ disabled, onSubmit }: { disabled: boolean; onSubmit: (request: ResearchRequest) => void }) {
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [brief, setBrief] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <Message>
      <MessageContent className="gap-3">
        <MessageHeader className="blueprint-label px-0 font-normal">{assistantName}</MessageHeader>
        <p className="text-sm leading-relaxed">
          Who should I add? I&apos;ll send research agents to public sources, one per driver you weight, and add the
          company next to your top 20.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const url = toWebsite(website)
            if (name.trim().length < 2) return setError("Name the company, at least two characters.")
            if (url === undefined) return setError("The website needs to be a web address, e.g. kiel-seating.com.")
            setError(null)
            onSubmit({ name: name.trim(), website: url, brief: brief.trim().slice(0, 600) })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="research-name" className="text-xs">Company</Label>
            <Input id="research-name" required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Franz Kiel GmbH" maxLength={120} className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="research-website" className="text-xs">Website <span className="text-[var(--blueprint-muted)]">optional</span></Label>
            <Input id="research-website" inputMode="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="kiel-seating.com" className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="research-brief" className="text-xs">What you know or want to know <span className="text-[var(--blueprint-muted)]">optional</span></Label>
            <Textarea id="research-brief" rows={2} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Makes passenger seats; any recent quality or financial trouble?" maxLength={600} className={`min-h-14 resize-none ${fieldClass}`} />
          </div>
          {error && <p role="alert" className="text-xs">{error}</p>}
          <Button type="submit" disabled={disabled} className="self-start rounded-sm bg-[var(--blueprint-ink)] text-[var(--blueprint-paper)] hover:bg-[var(--blueprint-ink)]/90">
            Research and add
          </Button>
        </form>
      </MessageContent>
    </Message>
  )
}

const FINISHED = new Set(["estimated", "no_evidence", "failed"])

/** A research run in the chat: scout, one live card per driver agent, the editor, then the briefing and its receipt. */
export function ResearchMessage({ name, run, query }: { name: string; run: ResearchRun; query: string }) {
  const agents = Object.values(run.agents).filter((agent) => agent !== undefined)
  const finished = agents.filter((agent) => FINISHED.has(agent.status)).length
  const agentModels = [...new Set(agents.flatMap(({ thread }) => thread.flatMap(({ model }) => (model ? [modelName(model)] : []))))]
  const failed = run.error !== null
  const step = (done: boolean) => (done ? undefined : failed ? "error" : "running")
  const icon = (done: boolean) => (done ? <CheckIcon /> : failed ? <XIcon /> : <Spinner />)

  return (
    <Message>
      <MessageContent className="gap-3">
        <MessageHeader className="blueprint-label px-0 font-normal">{assistantName} / Researching {name} · public sources</MessageHeader>
        <Trace className="gap-1">
          <TraceLine status={step(run.scout?.status === "done")} className="text-xs">
            <TraceIcon>{icon(run.scout?.status === "done")}</TraceIcon>
            <TraceTitle className="whitespace-normal">{run.scout?.text ?? `Identifying ${name}`}</TraceTitle>
            {run.scout?.model && <Badge>{modelName(run.scout.model)}</Badge>}
          </TraceLine>
          {agents.length > 0 && (
            <TraceLine status={step(finished === agents.length)} className="text-xs">
              <TraceIcon>{icon(finished === agents.length)}</TraceIcon>
              <TraceTitle>{finished} of {agents.length} driver agents done · {run.sources.length} sources kept</TraceTitle>
              {agentModels.length > 0 && <Badge>{agentModels.join(" + ")}</Badge>}
            </TraceLine>
          )}
          {run.editor && (
            <TraceLine status={step(run.editor.status === "done")} className="text-xs">
              <TraceIcon>{icon(run.editor.status === "done")}</TraceIcon>
              <TraceTitle>{run.editor.status === "done" ? "Editor wrote the briefing" : "Editor is writing the briefing"}</TraceTitle>
              {run.editor.model && <Badge>{modelName(run.editor.model)}</Badge>}
            </TraceLine>
          )}
        </Trace>
        {agents.length > 0 && <AgentGrid agents={run.agents} sources={run.sources} compact />}
        {run.error && <p role="alert" className="border-l-2 border-[var(--blueprint-ink)] pl-3 text-sm">{run.error}</p>}
        {run.supplier && <ResearchResult supplier={run.supplier} query={query} />}
      </MessageContent>
    </Message>
  )
}

function Badge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-sm border border-[var(--blueprint-rule)] px-1.5 font-mono text-[10px] tracking-[0.06em] text-[var(--blueprint-muted)] uppercase">
      {children}
    </span>
  )
}

function ResearchResult({ supplier, query }: { supplier: ResearchedSupplier; query: string }) {
  const { seconds, costUsd, tavilyCredits, models } = supplier.run
  return (
    <section aria-label={`Research on ${supplier.name}`} className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed">{supplier.summary}</p>
      {supplier.insights.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {supplier.insights.map((insight) => (
            <li key={insight.headline} className="flex flex-col gap-1">
              <span>
                {insight.criterion && <span className="font-medium">{CRITERION_BY_KEY[insight.criterion].label}: </span>}
                {insight.headline}
              </span>
              <SourceChips ids={insight.sourceIds} sources={supplier.sources} />
            </li>
          ))}
        </ul>
      )}
      <Link href={`/suppliers/${supplier.id}?${query}`} className="flex w-fit items-center gap-1.5 text-sm font-medium hover:underline">
        Open the research <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
      <p className="font-mono text-[11px] text-[var(--blueprint-muted)]">
        Added to your seat view · {seconds} s · ${costUsd.toFixed(3)} · {tavilyCredits} Tavily credits · {models.map(modelName).join(" + ")} on Nebius
      </p>
    </section>
  )
}
