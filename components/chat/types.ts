import type { ChatResponse } from "@/lib/chat-contract"

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: ChatResponse }

export type ChatStatus = "ready" | "pending" | "error"
