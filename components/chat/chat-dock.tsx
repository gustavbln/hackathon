"use client"

import { useState } from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { chatResponseSchema } from "@/lib/chat-contract"

import { AssistantAvatar, assistantName } from "./assistant-avatar"
import { ChatComposer, ChatThread } from "./chat"
import type { ChatMessage, ChatStatus } from "./types"

// The backend accepts at most 12 history turns of 2,000 characters each.
function toHistory(messages: ChatMessage[]) {
  return messages.slice(-12).map((message) =>
    message.role === "user"
      ? { role: "user" as const, content: message.text.slice(0, 2_000) }
      : { role: "assistant" as const, content: message.response.answer.slice(0, 2_000) },
  )
}

async function askChat(text: string, previous: ChatMessage[]) {
  const lastAnswer = previous.findLast((message) => message.role === "assistant")
  const lastView = lastAnswer?.role === "assistant" ? lastAnswer.response.lastView : null
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      history: toHistory(previous),
      ...(lastView && { lastView }),
    }),
  })
  const body: unknown = await response.json()
  if (!response.ok) {
    const message = (body as { error?: { message?: string } }).error?.message
    throw new Error(message ?? "The chat request failed. Please retry.")
  }
  return chatResponseSchema.parse(body)
}

// Header button; the panel drops below it without dimming the page.
export function ChatDock() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>("ready")
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function send(text: string) {
    const previous = messages
    setOpen(true)
    setStatus("pending")
    setError(null)
    setMessages([...previous, { id: crypto.randomUUID(), role: "user", text }])
    try {
      const response = await askChat(text, previous)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", response }])
      setStatus("ready")
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The chat request failed. Please retry.")
      setStatus("error")
    }
  }

  return (
    <div onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
      {open && (
        <section
          id="supplier-assistant"
          aria-label="Supplier assistant"
          className="fixed top-[5.5rem] right-5 z-40 flex w-[min(32rem,calc(100vw-2.5rem))] flex-col sm:right-10 lg:right-16 border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)]/95 text-[var(--blueprint-ink)] backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-2"
        >
          <header className="flex items-center justify-between border-b border-[var(--blueprint-rule)] py-1 pr-1 pl-4">
            <span className="blueprint-label">{assistantName} / Runs on NVIDIA Nemotron</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
            >
              <XIcon strokeWidth={1.5} />
            </Button>
          </header>
          <ChatThread messages={messages} status={status} error={error} />
          <div className="border-t border-[var(--blueprint-rule)] focus-within:border-[var(--blueprint-muted)]">
            <ChatComposer disabled={status === "pending"} onSend={send} />
          </div>
        </section>
      )}
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="supplier-assistant"
        aria-label={open ? `Close ${assistantName}` : `Ask ${assistantName}, the supplier assistant`}
        className="text-[var(--blueprint-ink)] transition-transform hover:-translate-y-0.5 hover:bg-transparent hover:text-[var(--blueprint-ink)] aria-expanded:bg-transparent aria-expanded:text-[var(--blueprint-ink)]"
      >
        <AssistantAvatar thinking={status === "pending"} className="size-8" />
      </Button>
    </div>
  )
}
