import { ArmchairIcon } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SeatCriteriaResponse } from "@/lib/seat-criteria-contract"

export function SeatCriteriaView({ result }: { result: SeatCriteriaResponse }) {
  return (
    <Card role="region" aria-label="Seat sourcing priorities" className="gap-0 rounded-lg border border-[var(--blueprint-rule)] bg-transparent text-[var(--blueprint-ink)] ring-0">
      <CardHeader className="gap-2 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="blueprint-label inline-flex items-center gap-2">
            <ArmchairIcon className="size-3.5" aria-hidden="true" />
            Seat sourcing
          </span>
        </div>
        <CardTitle className="text-base font-medium tracking-tight">What matters most for seats?</CardTitle>
        <CardDescription className="text-xs leading-relaxed text-[var(--blueprint-muted)]">
          Top 5 of {result.criteria.length} criteria · {result.runCount} evaluations
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible role="list" aria-label="Top five priorities">
          {result.criteria.slice(0, 5).map((criterion, index) => (
            <AccordionItem key={criterion.key} value={criterion.key} role="listitem" className="border-[var(--blueprint-rule)]">
              <AccordionTrigger className="items-center gap-2 rounded-none py-2 hover:no-underline [&_[data-slot=accordion-trigger-icon]]:text-[var(--blueprint-muted)]">
                <span className="w-4 shrink-0 font-mono text-[10px] text-[var(--blueprint-muted)]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium">{criterion.label}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums">
                      {criterion.meanImportance.toFixed(1)}<span className="text-[10px] text-[var(--blueprint-muted)]"> / 10</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <Progress value={criterion.meanImportance * 10} aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-[var(--blueprint-grid)] [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-[var(--blueprint-ink)]" />
                    <span className="shrink-0 font-mono text-[10px] font-normal text-[var(--blueprint-muted)]">{criterion.weightPercent.toFixed(1)}% weight</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-6 text-xs leading-relaxed text-[var(--blueprint-muted)]">
                <p>{criterion.reasons[0]}</p>
                <p className="mt-2 font-mono text-[10px]">Run scores: {criterion.scores.join(" / ")} · Average: {criterion.meanImportance.toFixed(1)}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Accordion type="single" collapsible className="mt-1 border-t border-[var(--blueprint-rule)]">
          <AccordionItem value="method" className="border-0">
            <AccordionTrigger className="gap-2 rounded-none text-xs text-[var(--blueprint-muted)] hover:no-underline [&_[data-slot=accordion-trigger-icon]]:text-[var(--blueprint-muted)]">
              All {result.criteria.length} criteria & evaluation details
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <p className="mb-3 text-xs leading-relaxed text-[var(--blueprint-muted)]">
                Each run scores importance from 0–10. The three scores are averaged, then
                normalized into weights totaling 100% across all {result.criteria.length} criteria.
              </p>
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-[var(--blueprint-rule)] hover:bg-transparent">
                    {["Criterion", "3 runs", "Average", "Weight"].map((label, index) => (
                      <TableHead key={label} className={`h-8 px-1 text-[10px] text-[var(--blueprint-muted)] ${index ? "text-right" : "text-left"}`}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.criteria.map((criterion) => (
                    <TableRow key={criterion.key} className="border-[var(--blueprint-rule)] hover:bg-[var(--blueprint-grid)]">
                      <TableCell className="px-1 text-xs">{criterion.label}</TableCell>
                      <TableCell className="px-1 text-right font-mono text-[10px] tabular-nums">{criterion.scores.join(" / ")}</TableCell>
                      <TableCell className="px-1 text-right font-mono text-[10px] tabular-nums">{criterion.meanImportance.toFixed(1)}</TableCell>
                      <TableCell className="px-1 text-right font-mono text-[10px] tabular-nums">{criterion.weightPercent.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--blueprint-muted)]">
          AI-suggested importance, not supplier risk or engineering approval.
        </p>
      </CardContent>
    </Card>
  )
}
