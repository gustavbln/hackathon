"use client"

import type { CSSProperties, ReactNode } from "react"

import { useSupplierScores } from "@/components/cabin/use-supplier-scores"
import { RiskFingerprint } from "@/components/leaderboard/risk-fingerprint"
import { Skeleton } from "@/components/ui/skeleton"
import type { PageContext } from "@/lib/chat-contract"
import { buildBriefing } from "@/lib/suppliers/briefing"
import { CRITERIA, CRITERION_BY_KEY } from "@/lib/suppliers/criteria"
import { topByWeights } from "@/lib/suppliers/scoring"

import { AssistantAvatar, assistantName } from "./assistant-avatar"

const HIDDEN_SHOWN = 3

/** Gauge's opening for a seat: computed from the dataset in the browser, so it is instant and never invented. */
export function SeatBriefing({ focus }: { focus: Extract<PageContext, { page: "seat" }> }) {
  const matrix = useSupplierScores()
  const briefing = matrix && buildBriefing(matrix, focus.weights,
    topByWeights(matrix.scores, matrix.keys.map((key) => focus.weights[key]), 20).map(({ row }) => matrix.ids[row]))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
      <Reveal step={0} className="flex items-center gap-3">
        <AssistantAvatar thinking={!briefing} className="size-10" />
        <div>
          <p className="text-sm">
            Hi, I&apos;m {assistantName}. <span className="text-[var(--blueprint-muted)]">Here&apos;s what I see.</span>
          </p>
          <p className="blueprint-label mt-0.5">Seat {focus.seatId} / Briefing</p>
        </div>
      </Reveal>

      {!briefing ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((index) => <Skeleton key={index} className="h-20 rounded-none bg-[var(--blueprint-grid)]" />)}
        </div>
      ) : (
        <>
          {briefing.top && (
            <Reveal step={1} label="Top pick">
              <div className="flex items-center gap-4">
                <RiskFingerprint scores={briefing.top.scores} criteria={[...CRITERIA]} weights={focus.weights} size={84} detailed />
                <div className="min-w-0">
                  <p className="font-mono text-xs">{briefing.top.id}</p>
                  <p className="truncate text-xs text-[var(--blueprint-muted)]">{briefing.top.name}</p>
                  <p className="mt-2 text-2xl font-medium tracking-tight tabular-nums">{briefing.top.risk.toFixed(1)}</p>
                  <p className="text-xs text-[var(--blueprint-muted)]">
                    weighted risk, lowest of {briefing.supplierCount.toLocaleString("en")}
                  </p>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal step={2} label="Hidden risk">
            {briefing.hidden.length === 0 ? (
              <p className="text-sm">None of your top {briefing.shortlistSize} hides a Critical score.</p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="font-medium text-[var(--risk-critical)]">{briefing.hidden.length}</span> of your top{" "}
                  {briefing.shortlistSize} hide a Critical score.
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {briefing.hidden.slice(0, HIDDEN_SHOWN).map(({ id, criterion, score }) => (
                    <li key={id} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-mono">{id}</span>
                      <span className="text-[var(--blueprint-muted)]">
                        {CRITERION_BY_KEY[criterion].label} <span className="font-mono text-[var(--risk-critical)]">{score}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Reveal>

          <Reveal step={3} label="Driving the ranking">
            <ol className="flex flex-col gap-2">
              {briefing.priorities.map(({ key, label, percent }) => (
                <li key={key} className="text-xs">
                  <div className="flex justify-between gap-3">
                    <span>{label}</span>
                    <span className="font-mono text-[var(--blueprint-muted)] tabular-nums">{percent.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-px bg-[var(--blueprint-rule)]">
                    <div className="h-px bg-[var(--blueprint-ink)]" style={{ width: `${(percent / (briefing.priorities[0]?.percent || 1)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal step={4}>
            <p className="text-xs text-[var(--blueprint-muted)]">Ask me to compare, explain or re-rank these suppliers.</p>
          </Reveal>
        </>
      )}
    </div>
  )
}

/** Sections arrive one after another, like Gauge reading them out. */
function Reveal({ step, label, className, children }: { step: number; label?: string; className?: string; children: ReactNode }) {
  return (
    <section
      className={`animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-500 motion-reduce:animate-none ${label ? "border-t border-[var(--blueprint-rule)] pt-4" : ""} ${className ?? ""}`}
      style={{ animationDelay: `${step * 120}ms` } as CSSProperties}
    >
      {label && <h3 className="blueprint-label mb-3">{label}</h3>}
      {children}
    </section>
  )
}
