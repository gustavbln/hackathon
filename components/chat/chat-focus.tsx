"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

import type { PageAction, PageContext } from "@/lib/chat-contract"

type ActionHandler = (action: PageAction) => void
type AskHandler = (question: string) => void

type FocusState = {
  /** The page on screen, as ids and the buyer's inputs; the assistant answers about this. */
  page: PageContext | null
  setPage: (page: PageContext | null) => void
  /** Parts of the page on screen register how they apply the assistant's actions; returns the unsubscribe. */
  onAction: (handler: ActionHandler) => () => void
  applyActions: (actions: PageAction[]) => void
  /** Pages ask a question for the buyer (e.g. a "Why is there this risk?" button); the chat panel opens and sends it. */
  ask: (question: string) => void
  /** The chat panel registers how it answers `ask`; returns the unsubscribe. */
  onAsk: (handler: AskHandler) => () => void
}

const ChatFocusContext = createContext<FocusState | null>(null)

/** Shares what the page shows with the assistant, and hands the assistant's actions back to that page. */
export function ChatFocusProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageContext | null>(null)
  // Each handler ignores the actions it doesn't own, so a page can split them across its parts.
  const handlers = useRef(new Set<ActionHandler>())
  const asker = useRef<AskHandler | null>(null)

  const onAction = useCallback((handler: ActionHandler) => {
    handlers.current.add(handler)
    return () => {
      handlers.current.delete(handler)
    }
  }, [])
  const applyActions = useCallback((actions: PageAction[]) => {
    for (const action of actions) for (const handler of handlers.current) handler(action)
  }, [])
  const onAsk = useCallback((handler: AskHandler) => {
    asker.current = handler
    return () => {
      if (asker.current === handler) asker.current = null
    }
  }, [])
  const ask = useCallback((question: string) => asker.current?.(question), [])
  const value = useMemo(
    () => ({ page, setPage, onAction, applyActions, ask, onAsk }),
    [page, onAction, applyActions, ask, onAsk],
  )

  return <ChatFocusContext value={value}>{children}</ChatFocusContext>
}

export function useChatFocus() {
  const context = useContext(ChatFocusContext)
  if (!context) throw new Error("useChatFocus needs a ChatFocusProvider (ChatWorkspace provides one).")
  return context
}
