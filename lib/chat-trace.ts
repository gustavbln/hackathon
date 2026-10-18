import type { ChatStep, ModelCall } from "./chat-contract.ts";
import type { UsageSink } from "./nemotron.ts";

export type StepSink = (step: ChatStep) => void;
/** What one traced step spent: model calls report themselves, searches add their credits. */
export interface Meter {
  onUsage: UsageSink;
  addCredits: (credits: number) => void;
}
export type Step = <T>(label: string, source: ChatStep["source"], work: (meter: Meter) => Promise<T>, doneLabel?: (value: T) => string) => Promise<T>;

const timedOut = (error: unknown) => error instanceof DOMException && error.name === "TimeoutError";

/** Each piece of work becomes one trace line: running, then done or error with its time, model calls and credits. */
export function tracer(onStep: StepSink): Step {
  let count = 0;
  return async (label, source, work, doneLabel) => {
    const id = String(++count);
    const calls: ModelCall[] = [];
    let credits = 0;
    const started = performance.now();
    const report = (status: ChatStep["status"], text = label) => onStep({
      id, label: text, source, status, calls: [...calls], credits,
      ms: status === "running" ? null : Math.round(performance.now() - started),
    });
    report("running");
    try {
      const value = await work({ onUsage: (call) => calls.push(call), addCredits: (spent) => { credits += spent; } });
      report("done", doneLabel?.(value));
      return value;
    } catch (error) {
      report("error", timedOut(error) ? `${label}: timed out` : label);
      throw error;
    }
  };
}
