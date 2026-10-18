import type { ChatResponse, ChatStep } from "@/lib/chat-contract"

/** How an answer came about: its streamed steps and the wall-clock time the buyer waited. */
export type ChatTrace = { steps: ChatStep[]; elapsedMs: number }

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: ChatResponse; trace: ChatTrace }

export type ChatStatus = "ready" | "pending" | "error"
