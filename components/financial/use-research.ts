"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  researchEventSchema,
  researchRunSummarySchema,
  type ResearchEvent,
  type ResearchInput,
  type ResearchReport,
  type ResearchRunSummary,
} from "@/lib/market/model";

/** Recordings arrive in one burst; a short gap per event lets the buyer watch the replay unfold. */
const REPLAY_GAP_MS = 30;

export type ResearchRequest = { kind: "live"; input: ResearchInput } | { kind: "replay"; runId: string };

export interface ResearchState {
  status: "idle" | "running" | "done" | "error";
  request: ResearchRequest | null;
  events: ResearchEvent[];
  /** Wall-clock start in the browser, for the live timer. */
  startedAt: number | null;
  error: string | null;
}

export function useResearch() {
  const [state, setState] = useState<ResearchState>({ status: "idle", request: null, events: [], startedAt: null, error: null });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (request: ResearchRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "running", request, events: [], startedAt: Date.now(), error: null });

    const fail = (message: string) =>
      setState((current) => (current.request === request ? { ...current, status: "error", error: message } : current));

    try {
      const response = await fetch(
        request.kind === "live" ? "/api/research" : `/api/research?run=${encodeURIComponent(request.runId)}`,
        request.kind === "live"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request.input),
              signal: controller.signal,
            }
          : { signal: controller.signal },
      );
      if (!response.ok || response.body === null) throw new Error(await errorMessage(response));

      for await (const event of readEvents(response.body)) {
        if (request.kind === "replay") await sleep(REPLAY_GAP_MS, controller.signal);
        setState((current) =>
          current.request !== request
            ? current
            : {
                ...current,
                events: [...current.events, event],
                status: event.type === "report" ? "done" : event.type === "error" ? "error" : current.status,
                error: event.type === "error" ? event.message : current.error,
              },
        );
      }
      setState((current) =>
        current.request === request && current.status === "running"
          ? { ...current, status: "error", error: "The research stream ended before a report arrived." }
          : current,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      fail(
        error instanceof z.ZodError || error instanceof SyntaxError
          ? "The research service sent an event this page does not understand."
          : error instanceof Error
            ? error.message
            : "The research request failed. Please retry.",
      );
    }
  }, []);

  return { state, run };
}

/** Parses a Server-Sent Events body: one `data: <ResearchEvent JSON>` block per event. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ResearchEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data !== "") yield researchEventSchema.parse(JSON.parse(data));
    }
  }
}

async function errorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
  return parsed.success ? parsed.data.error.message : `The research service answered ${response.status}. Please retry.`;
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function reportOf(events: readonly ResearchEvent[]): ResearchReport | null {
  const last = events.findLast((event) => event.type === "report");
  return last?.type === "report" ? last.report : null;
}

export function cachedOf(events: readonly ResearchEvent[]) {
  const first = events[0];
  return first?.type === "cached" ? first : null;
}

export type RecordedRuns =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; runs: ResearchRunSummary[] };

const runListSchema = z.array(researchRunSummarySchema);

/** The recorded runs, newest first. `reload` refetches, e.g. after a live run was saved. */
export function useRecordedRuns() {
  const [runs, setRuns] = useState<RecordedRuns>({ state: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/research", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorMessage(response));
        return runListSchema.parse(await response.json());
      })
      .then(
        (list) => setRuns({ state: "ready", runs: list }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setRuns({
            state: "error",
            message:
              error instanceof Error && !(error instanceof z.ZodError)
                ? error.message
                : "The recorded runs could not be loaded.",
          });
        },
      );
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => {
    setRuns({ state: "loading" });
    setVersion((current) => current + 1);
  }, []);

  return { runs, reload };
}
