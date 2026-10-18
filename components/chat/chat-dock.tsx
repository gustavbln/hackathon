"use client"

import { useEffect, useEffectEvent, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowLeftIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Sidebar, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

import { chatResponseSchema, type PageAction, type PageContext } from "@/lib/chat-contract"
import { CRITERION_BY_KEY } from "@/lib/suppliers/criteria"
import { encodeWeights } from "@/lib/suppliers/profiles"

import { AssistantAvatar, assistantName } from "./assistant-avatar"
import { ChatComposer, ChatThread, PromptChips } from "./chat"
import { ChatFocusProvider, useChatFocus } from "./chat-focus"
import type { ChatMessage, ChatStatus } from "./types"

// The backend accepts at most 12 history turns of 2,000 characters each.
function toHistory(messages: ChatMessage[]) {
  return messages.slice(-12).map((message) =>
    message.role === "user"
      ? { role: "user" as const, content: message.text.slice(0, 2_000) }
      : { role: "assistant" as const, content: message.response.answer.slice(0, 2_000) },
  )
}

async function askChat(text: string, previous: ChatMessage[], page: PageContext | null) {
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
  const body: unknown = await response.json()
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message
    throw new Error(message ?? "The chat request failed. Please retry.")
  }
  return chatResponseSchema.parse(body)
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
  const { isMobile, open, setOpen, openMobile, setOpenMobile } = useSidebar()
  const { page, applyActions, onAsk } = useChatFocus()
  const router = useRouter()

  // A page asks for the buyer (e.g. "Why is there this risk?"): open the panel, then send.
  const askFromPage = useEffectEvent((question: string) => {
    if (isMobile) setOpenMobile(true)
    else setOpen(true)
    if (status !== "pending") void send(question)
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

  async function send(text: string) {
    const previous = messages
    setStatus("pending")
    setError(null)
    setMessages([...previous, { id: crypto.randomUUID(), role: "user", text }])
    try {
      const response = await askChat(text, previous, page)
      apply(response.actions)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", response }])
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
      <ChatThread messages={messages} status={status} error={error} />
      <div className="shrink-0 border-t border-[var(--blueprint-rule)] pb-[env(safe-area-inset-bottom)] focus-within:border-[var(--blueprint-muted)]">
        <PromptChips prompts={promptsFor(page)} disabled={status === "pending"} onPick={send} />
        <ChatComposer disabled={status === "pending"} onSend={send} />
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
    return [`What does ${driver} mean for seats?`, `Worst of my top 20 on ${driver}`]
  }
  return ["Why is there this risk?", "Show a safer alternative"]
}

function describePage(page: PageContext): string {
  if (page.page === "seat") return `Looking at seat ${page.seatId} and its top 20 suppliers`
  if (page.page === "driver") return `Looking at the ${CRITERION_BY_KEY[page.driverKey].label.toLowerCase()} driver`
  return `Looking at supplier ${page.supplierId}`
}
