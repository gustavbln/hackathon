"use client"

import { useEffect, useEffectEvent, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowLeftIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

import { chatEventSchema, type ChatStep, type PageAction, type PageContext } from "@/lib/chat-contract"
import { researchEventSchema, type ResearchEvent } from "@/lib/research/contract"
import { readEvents } from "@/lib/sse"
import { CRITERIA, CRITERION_BY_KEY } from "@/lib/suppliers/criteria"
import { encodeWeights } from "@/lib/suppliers/profiles"

import { AssistantAvatar, assistantName } from "./assistant-avatar"
import { ChatComposer, ChatThread, PromptChips } from "./chat"
import { ChatFocusProvider, useChatFocus } from "./chat-focus"
import type { ResearchRequest } from "./research-message"
import { applyResearchEvent, newResearchRun } from "./research-run"
import type { ChatMessage, ChatStatus } from "./types"

// The backend accepts at most 12 history turns of 2,000 characters each. A finished research run counts as an
// assistant turn, so "how risky is it?" right after adding a company knows which one.
function toHistory(messages: ChatMessage[]) {
  return messages.flatMap((message): { role: "user" | "assistant"; content: string }[] => {
    if (message.role === "user") return [{ role: "user", content: message.text.slice(0, 2_000) }]
    if (message.role === "assistant") return [{ role: "assistant", content: message.response.answer.slice(0, 2_000) }]
    const supplier = message.role === "research" ? message.run.supplier : null
    return supplier
      ? [{ role: "assistant", content: `Researched ${supplier.name} (${supplier.id}) from public sources and added it. ${supplier.summary}`.slice(0, 2_000) }]
      : []
  }).slice(-12)
}

/** The "+" under the top 20 asks this; so may the buyer. It opens the intake form instead of a free conversation. */
const ADD_SUPPLIER = /\badd (a |an )?(new )?supplier\b/i

/** Streams one research run into `onEvent`; the run itself reports failures as an `error` event. */
async function researchSupplier(body: object, onEvent: (event: ResearchEvent) => void) {
  const response = await fetch("/api/research/supplier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok || !response.body) {
    const answer: unknown = await response.json().catch(() => null)
    throw new Error((answer as { error?: { message?: string } } | null)?.error?.message ?? "The research could not start. Please retry.")
  }
  for await (const event of readEvents(response.body, researchEventSchema)) onEvent(event)
}

/** Streams one answer: each step goes to `onStep` as it happens, then the whole validated answer resolves. */
async function askChat(text: string, previous: ChatMessage[], page: PageContext | null, onStep: (step: ChatStep) => void) {
  const lastAnswer = previous.findLast((message) => message.role === "assistant")
  const lastView = lastAnswer?.role === "assistant" ? lastAnswer.response.lastView : null
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: toHistory(previous),
      ...(lastView && { lastView }),
      ...(page && { page }),
    }),
  })
  if (!response.ok || !response.body) {
    const body: unknown = await response.json().catch(() => null)
    const message = (body as { error?: { message?: string } } | null)?.error?.message
    throw new Error(message ?? "The chat request failed. Please retry.")
  }
  for await (const event of readEvents(response.body, chatEventSchema)) {
    if (event.type === "step") onStep(event.step)
    else if (event.type === "done") return event.response
    else throw new Error(event.error.message)
  }
  throw new Error("The answer stopped before it was complete. Please retry.")
}

/** Steps arrive as "running", then again under the same id when they finish. */
function upsertStep(steps: ChatStep[], step: ChatStep) {
  return steps.some(({ id }) => id === step.id) ? steps.map((current) => (current.id === step.id ? step : current)) : [...steps, step]
}

export function ChatWorkspace({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "min(420px, 42vw)" } as CSSProperties}>
      <ChatFocusProvider>
        {children}
        <ChatPanel />
      </ChatFocusProvider>
    </SidebarProvider>
  )
}

export function ChatDock() {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar()
  const expanded = isMobile ? openMobile : open
  return (
    <Button
      id="supplier-assistant-trigger"
      variant="ghost"
      size="icon-lg"
      onClick={toggleSidebar}
      aria-expanded={expanded}
      aria-controls="supplier-assistant"
      aria-label={expanded ? `Close ${assistantName}` : `Ask ${assistantName}, the supplier assistant`}
      className="text-[var(--blueprint-ink)] transition-transform hover:-translate-y-0.5 hover:bg-transparent hover:text-[var(--blueprint-ink)] aria-expanded:bg-transparent aria-expanded:text-[var(--blueprint-ink)]"
    >
      <AssistantAvatar className="size-8" />
    </Button>
  )
}

function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>("ready")
  const [error, setError] = useState<string | null>(null)
  const [liveSteps, setLiveSteps] = useState<ChatStep[]>([])
  const { isMobile, open, setOpen, openMobile, setOpenMobile } = useSidebar()
  const { page, applyActions, onAsk } = useChatFocus()
  const router = useRouter()

  const busy = status === "pending" || status === "researching"

  // A page asks for the buyer (e.g. "Why is there this risk?"): open the panel, then send.
  const askFromPage = useEffectEvent((question: string) => {
    if (isMobile) setOpenMobile(true)
    else setOpen(true)
    if (!busy) handle(question)
  })
  useEffect(() => onAsk((question) => askFromPage(question)), [onAsk])

  // Opening a supplier is navigation, so the dock handles it; everything else belongs to the page on screen.
  function apply(actions: PageAction[]) {
    const open = actions.find((action) => action.type === "open_supplier")
    if (open && page) {
      const query = new URLSearchParams({ ...(page.seatId && { seat: page.seatId }), w: encodeWeights(page.weights) })
      router.push(`/suppliers/${open.supplierId}?${query}`)
    }
    applyActions(actions.filter((action) => action.type !== "open_supplier"))
  }

  function close() {
    if (isMobile) setOpenMobile(false)
    else setOpen(false)
    document.getElementById("supplier-assistant-trigger")?.focus()
  }

  function handle(text: string) {
    if (!ADD_SUPPLIER.test(text)) return void send(text)
    // One intake at a time: a second "+" while the form is open just brings the panel up.
    if (messages.some((message) => message.role === "intake")) return
    setMessages([...messages, { id: crypto.randomUUID(), role: "user", text }, { id: crypto.randomUUID(), role: "intake" }])
  }

  /** Runs one research at a time; the seat page's weighted drivers decide which agents run. */
  async function research(request: ResearchRequest) {
    const id = crypto.randomUUID()
    const query = page ? new URLSearchParams({ ...(page.seatId && { seat: page.seatId }), w: encodeWeights(page.weights) }).toString() : ""
    const drivers = page?.page === "seat" ? CRITERIA.filter(({ key }) => page.weights[key] > 0).map(({ key }) => key) : undefined
    const told = [request.name, request.website, request.brief].filter(Boolean).join(" · ")
    setStatus("researching")
    setError(null)
    setMessages((current) => [
      ...current.filter((message) => message.role !== "intake"),
      { id: crypto.randomUUID(), role: "user", text: `Add ${told}` },
      { id, role: "research", name: request.name, run: newResearchRun, query },
    ])
    const update = (event: ResearchEvent) => setMessages((current) => current.map((message) =>
      message.id === id && message.role === "research" ? { ...message, run: applyResearchEvent(message.run, event) } : message))
    let added = false
    try {
      await researchSupplier({ ...request, ...(drivers && { drivers }) }, (event) => {
        update(event)
        if (event.type === "done") {
          added = true
          applyActions([{ type: "supplier_added", supplierId: event.supplier.id }])
        }
      })
      if (!added) update({ type: "error", message: "The research stopped before the company was added. Please retry." })
    } catch (failure) {
      update({ type: "error", message: failure instanceof Error ? failure.message : "The research failed. Please retry." })
    }
    setStatus("ready")
  }

  async function send(text: string) {
    const previous = messages
    setStatus("pending")
    setError(null)
    setMessages([...previous, { id: crypto.randomUUID(), role: "user", text }])
    setLiveSteps([])
    const started = performance.now()
    let steps: ChatStep[] = []
    try {
      const response = await askChat(text, previous, page, (step) => {
        steps = upsertStep(steps, step)
        setLiveSteps(steps)
      })
      apply(response.actions)
      const trace = { steps, elapsedMs: Math.round(performance.now() - started) }
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", response, trace }])
      setStatus("ready")
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The chat request failed. Please retry.")
      setStatus("error")
    }
  }

  const panel = (
    <section
      id="supplier-assistant"
      aria-label="Supplier assistant"
      onKeyDown={(event) => event.key === "Escape" && close()}
      className="flex h-full min-h-0 flex-col bg-[var(--blueprint-paper-deep)] text-[var(--blueprint-ink)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--blueprint-rule)] py-4 pr-3 pl-4">
        <div className="min-w-0">
          <h2 className="blueprint-label">{assistantName} / Runs on NVIDIA Nemotron</h2>
          {page && (
            <p className="mt-1 truncate text-xs text-[var(--blueprint-muted)]">{describePage(page)}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={close}
          aria-label={isMobile ? "Back to cabin" : "Close assistant"}
          className="hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
        >
          {isMobile ? <ArrowLeftIcon strokeWidth={1.5} /> : <XIcon strokeWidth={1.5} />}
        </Button>
      </header>
      <ChatThread messages={messages} status={status} error={error} liveSteps={liveSteps} onResearch={(request) => void research(request)} />
      <div className="shrink-0 border-t border-[var(--blueprint-rule)] pb-[env(safe-area-inset-bottom)] focus-within:border-[var(--blueprint-muted)]">
        <PromptChips prompts={promptsFor(page)} disabled={busy} onPick={handle} />
        <ChatComposer disabled={busy} onSend={handle} />
      </div>
    </section>
  )

  return isMobile ? (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        showCloseButton={false}
        className="gap-0 border-0 p-0 data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:max-w-none"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById("supplier-assistant-trigger")?.focus()
        }}
      >
        <SheetTitle className="sr-only">{assistantName} supplier assistant</SheetTitle>
        {panel}
      </SheetContent>
    </Sheet>
  ) : (
    <Sidebar side="right" className="border-[var(--blueprint-rule)]">
      {open && panel}
    </Sidebar>
  )
}

/** One-click questions that fit the page; each one maps to a tool that answers it from the page's own data. */
function promptsFor(page: PageContext | null): string[] {
  if (!page) return []
  if (page.page === "seat") return ["Why is #1 on top?", "Make quality matter more"]
  if (page.page === "driver") {
    const driver = CRITERION_BY_KEY[page.driverKey].label.toLowerCase()
    return [`What does ${driver} mean for seats?`, `Worst of my top 20 on ${driver}`, "Related standards (web)"]
  }
  if (page.page === "researched") return ["How risky is this supplier?", "What did the agents find?", "Which drivers have no evidence?"]
  return ["Why is there this risk?", "What does its top risk mean? (web)", "Show a safer alternative"]
}

function describePage(page: PageContext): string {
  if (page.page === "seat") return `Looking at seat ${page.seatId} and its top 20 suppliers`
  if (page.page === "driver") return `Looking at the ${CRITERION_BY_KEY[page.driverKey].label.toLowerCase()} driver`
  if (page.page === "researched") return `Looking at researched supplier ${page.supplierId}`
  return `Looking at supplier ${page.supplierId}`
}
