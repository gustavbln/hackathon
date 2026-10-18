"use client"

import { useState } from "react"
import { ArrowUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Textarea } from "@/components/ui/textarea"
import { Trace, TraceLine, TraceTitle } from "@/components/ui/trace"

import { AssistantAvatar, assistantName } from "./assistant-avatar"
import { ChatMessage } from "./chat-message"
import type { ChatMessage as ChatMessageData, ChatStatus } from "./types"

type ChatThreadProps = {
  messages: ChatMessageData[]
  status: ChatStatus
  error: string | null
}

export function ChatThread({ messages, status, error }: ChatThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-[min(50svh,24rem)] flex-col items-center justify-center gap-4 px-8 py-10 text-center">
        <AssistantAvatar className="size-16" />
        <p className="max-w-sm text-sm leading-relaxed">
          Hi, I&apos;m {assistantName}.{" "}
          <span className="text-[var(--blueprint-muted)]">
            Ask me about any supplier, risk score or ranking. Every number I give you comes
            straight from the supplier dataset.
          </span>
        </p>
      </div>
    )
  }

  return (
    <MessageScrollerProvider>
      <MessageScroller className="h-[min(60svh,36rem)]">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-6 p-4">
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.role === "user"}
              >
                <ChatMessage message={message} />
              </MessageScrollerItem>
            ))}
            {status === "pending" && (
              <Trace>
                <TraceLine status="running" className="text-[var(--blueprint-muted)]">
                  <AssistantAvatar thinking className="size-5" />
                  <TraceTitle>{assistantName} is checking the supplier dataset…</TraceTitle>
                </TraceLine>
              </Trace>
            )}
            {status === "error" && error && (
              <p role="alert" className="border-l-2 border-[var(--blueprint-ink)] pl-3 text-sm">
                {error}
              </p>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

type ChatComposerProps = {
  disabled: boolean
  onSend: (text: string) => void
}

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState("")
  const text = draft.trim()

  function submit() {
    if (!text || disabled) return
    onSend(text)
    setDraft("")
  }

  return (
    <form
      className="flex items-end gap-3 py-2 pr-2 pl-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Textarea
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        placeholder="Ask about suppliers, risk scores or rankings"
        aria-label="Message"
        rows={1}
        className="max-h-40 min-h-9 resize-none rounded-none border-0 bg-transparent px-0 text-[var(--blueprint-ink)] placeholder:text-[var(--blueprint-muted)] focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={!text || disabled}
        aria-label="Send"
        className="shrink-0 rounded-none border border-[var(--blueprint-rule)] text-[var(--blueprint-ink)] hover:border-[var(--blueprint-muted)] hover:bg-[var(--blueprint-grid)] hover:text-[var(--blueprint-ink)]"
      >
        <ArrowUpIcon strokeWidth={1.5} />
      </Button>
    </form>
  )
}
