import { Message, MessageContent, MessageHeader } from "@/components/ui/message"

import { assistantName } from "./assistant-avatar"
import { TraceSummary } from "./chat-trace"
import { SupplierView } from "./supplier-view"
import { SeatCriteriaView } from "./seat-criteria-view"
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

  const { answer, view, seatCriteria } = message.response
  return (
    <Message>
      <MessageContent className="gap-2">
        {/* Every answer names where its numbers come from: the stakeholder asked for it. */}
        <MessageHeader className="blueprint-label px-0 font-normal">
          {assistantName}{view && " / Supplier dataset"}
        </MessageHeader>
        {message.trace.steps.length > 0 && <TraceSummary trace={message.trace} />}
        {seatCriteria ? <SeatCriteriaView result={seatCriteria} /> : <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>}
        {view && <SupplierView view={view} />}
      </MessageContent>
    </Message>
  )
}
