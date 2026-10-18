"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

import type { SeatFocus } from "@/lib/chat-contract"
import type { SeatShortlist } from "@/lib/seat-shortlist-contract"

type RerankHandler = (shortlist: SeatShortlist) => void

type FocusState = {
  focus: SeatFocus | null
  setFocus: (focus: SeatFocus | null) => void
  /** The panel showing the shortlist listens here; returns the unsubscribe. */
  onRerank: (handler: RerankHandler) => () => void
  /** The assistant hands over a shortlist it re-ranked, so the page shows it without a second fetch. */
  applyRerank: RerankHandler
}

const ChatFocusContext = createContext<FocusState | null>(null)

/** Shares what the page shows (seat, weights, shortlist) with the assistant, and the assistant's re-ranks back. */
export function ChatFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<SeatFocus | null>(null)
  const handler = useRef<RerankHandler | null>(null)

  const onRerank = useCallback((next: RerankHandler) => {
    handler.current = next
    return () => {
      if (handler.current === next) handler.current = null
    }
  }, [])
  const applyRerank = useCallback((shortlist: SeatShortlist) => handler.current?.(shortlist), [])
  const value = useMemo(() => ({ focus, setFocus, onRerank, applyRerank }), [focus, onRerank, applyRerank])

  return <ChatFocusContext value={value}>{children}</ChatFocusContext>
}

export function useChatFocus() {
  const context = useContext(ChatFocusContext)
  if (!context) throw new Error("useChatFocus needs a ChatFocusProvider (ChatWorkspace provides one).")
  return context
}
