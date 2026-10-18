import { ExternalLinkIcon } from "lucide-react"

import { SourceLink } from "@/components/research/source-viewer"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import type { ChatResponse, WebSource } from "@/lib/chat-contract"

import { assistantName } from "./assistant-avatar"
import { TraceSummary } from "./chat-trace"
import { ResearchIntake, ResearchMessage, type ResearchRequest } from "./research-message"
import { SupplierView } from "./supplier-view"
import { SeatCriteriaView } from "./seat-criteria-view"
import type { ChatMessage as ChatMessageData } from "./types"

type ChatMessageProps = {
  message: ChatMessageData
  /** A research run is in progress, so a new one cannot start. */
  researching: boolean
  onResearch: (request: ResearchRequest) => void
}

export function ChatMessage({ message, researching, onResearch }: ChatMessageProps) {
  if (message.role === "intake") return <ResearchIntake disabled={researching} onSubmit={onResearch} />
  if (message.role === "research") return <ResearchMessage name={message.name} run={message.run} query={message.query} />
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

  const { answer, view, seatCriteria, webContext, researchSources } = message.response
  return (
    <Message>
      <MessageContent className="gap-2">
        {/* Every answer names where its numbers come from: the stakeholder asked for it. */}
        <MessageHeader className="blueprint-label px-0 font-normal">
          {assistantName}{view && " / Supplier dataset"}
        </MessageHeader>
        {message.trace.steps.length > 0 && <TraceSummary trace={message.trace} />}
        {webContext && <p className="blueprint-label">From the dataset</p>}
        {seatCriteria ? <SeatCriteriaView result={seatCriteria} /> : <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>}
        {researchSources.length > 0 && (
          <section aria-label="Research sources" className="flex flex-col gap-1.5">
            <p className="blueprint-label">Sources / public research by Nemotron agents</p>
            <SourceList sources={researchSources} research />
          </section>
        )}
        {view && <SupplierView view={view} />}
        {webContext && <WebContextBlock context={webContext} />}
      </MessageContent>
    </Message>
  )
}

/** Web context stays visibly apart from the dataset answer, with every cited source one click away. */
function WebContextBlock({ context }: { context: NonNullable<ChatResponse["webContext"]> }) {
  return (
    <section aria-label="Web context" className="mt-1 flex flex-col gap-2 border-l-2 border-[var(--blueprint-rule)] pl-3">
      <p className="blueprint-label">Web context / general context, not about this supplier</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{context.text}</p>
      <SourceList sources={context.sources} />
    </section>
  )
}

/**
 * Numbered source chips; hovering shows the title and the quoted passage. Research sources open in the side panel next
 * to the page (Cmd-click for a new tab); web context opens the page itself.
 */
function SourceList({ sources, research = false }: { sources: WebSource[]; research?: boolean }) {
  const chip = "flex max-w-56 items-center gap-1.5 rounded-full border border-[var(--blueprint-rule)] px-2.5 py-0.5 text-xs hover:border-[var(--blueprint-muted)] hover:bg-[var(--blueprint-grid)] focus-visible:outline-2 focus-visible:outline-offset-2"
  return (
    <ol aria-label="Sources" className="flex flex-wrap gap-1.5">
      {sources.map((source) => {
        const label = (
          <>
            <span className="font-mono text-[var(--blueprint-muted)]">{source.n}</span>
            <span className="truncate">{source.domain}</span>
          </>
        )
        return (
          <li key={source.n} className="min-w-0" title={`${source.title}\n“${source.quote}”`}>
            {research ? (
              <SourceLink
                source={{ id: source.n, url: source.url, title: source.title, publishedAt: source.publishedDate, quote: source.quote, excerpt: null }}
                className={chip}
              >
                {label}
              </SourceLink>
            ) : (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={chip}>
                {label}
                <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0 text-[var(--blueprint-muted)]" />
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
