import type { ChatResponse, ChatStep } from "@/lib/chat-contract"

import type { ResearchRun } from "./research-run"

/** How an answer came about: its streamed steps and the wall-clock time the buyer waited. */
export type ChatTrace = { steps: ChatStep[]; elapsedMs: number }

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; response: ChatResponse; trace: ChatTrace }
  /** The add-supplier form. */
  | { id: string; role: "intake" }
  /** A research run; `query` carries the seat and weights to the researched company's page. */
  | { id: string; role: "research"; name: string; run: ResearchRun; query: string }

export type ChatStatus = "ready" | "pending" | "researching" | "error"
