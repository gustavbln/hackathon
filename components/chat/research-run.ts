import type { AgentState } from "@/components/research/agent-grid"
import type { ResearchEvent, ResearchedSupplier, ResearchSource } from "@/lib/research/contract"
import type { CriterionKey } from "@/lib/suppliers/criteria"

/** A research run as the chat shows it while the agents work, then its saved result. */
export interface ResearchRun {
  scout: { status: "running" | "done"; text: string; model: string | null } | null
  agents: Partial<Record<CriterionKey, AgentState>>
  sources: ResearchSource[]
  editor: { status: "running" | "done"; model: string | null } | null
  supplier: ResearchedSupplier | null
  error: string | null
}

export const newResearchRun: ResearchRun = { scout: null, agents: {}, sources: [], editor: null, supplier: null, error: null }

/** Folds one streamed event into the run; each agent keeps its own growing thread. */
export function applyResearchEvent(run: ResearchRun, event: ResearchEvent): ResearchRun {
  switch (event.type) {
    case "scout":
      return { ...run, scout: { status: event.status, text: event.text, model: event.model } }
    case "agent": {
      const previous = run.agents[event.criterion]
      const agent: AgentState = {
        status: event.status,
        estimate: event.estimate ?? previous?.estimate ?? null,
        thread: event.entry ? [...(previous?.thread ?? []), event.entry] : (previous?.thread ?? []),
      }
      return { ...run, agents: { ...run.agents, [event.criterion]: agent } }
    }
    case "source":
      return { ...run, sources: [...run.sources, event.source] }
    case "editor":
      return { ...run, editor: { status: event.status, model: event.model } }
    case "done":
      // The saved result is the record from now on: the same agents and sources the stream showed.
      return { ...run, supplier: event.supplier, agents: event.supplier.agents, sources: event.supplier.sources }
    case "error":
      return { ...run, error: event.message }
  }
}
