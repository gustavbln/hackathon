import { CheckIcon, XIcon } from "lucide-react"

import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import {
  Trace,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"

import { assistantName } from "./assistant-avatar"
import { SupplierView } from "./supplier-view"
import type { ChatMessage as ChatMessageData } from "./types"

export function ChatMessage({ message }: { message: ChatMessageData }) {
  if (message.role === "user") {
    return (
      <Message>
        <MessageContent className="gap-1.5">
          <MessageHeader className="blueprint-label px-0 font-normal">You</MessageHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </MessageContent>
      </Message>
    )
  }

  const { answer, view, tools } = message.response
  return (
    <Message>
      <MessageContent className="gap-2">
        {/* Every answer names where its numbers come from: the stakeholder asked for it. */}
        <MessageHeader className="blueprint-label px-0 font-normal">
          {assistantName}{view && " / Supplier dataset"}
        </MessageHeader>
        {tools.length > 0 && (
          <Trace className="gap-1">
            {tools.map((tool) => (
              <TraceLine key={tool.resultId} status={tool.status === "error" ? "error" : undefined}>
                <TraceIcon>{tool.status === "ok" ? <CheckIcon /> : <XIcon />}</TraceIcon>
                <TraceTitle className="font-mono text-xs">{tool.name}</TraceTitle>
              </TraceLine>
            ))}
          </Trace>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        {view && <SupplierView view={view} />}
      </MessageContent>
    </Message>
  )
}
