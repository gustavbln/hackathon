import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ChatResponse } from "@/lib/chat-contract"

type View = NonNullable<ChatResponse["view"]>

const euro = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
})

function formatValue(value: number, unit: string) {
  if (unit === "EUR") return euro.format(value)
  if (unit === "%") return `${value}%`
  return String(value)
}

export function SupplierView({ view }: { view: View }) {
  return (
    <figure className="border border-[var(--blueprint-rule)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--blueprint-rule)] hover:bg-transparent">
            <TableHead className="blueprint-label h-8">Supplier</TableHead>
            {view.metrics.map((metric) => (
              <TableHead key={metric.key} className="blueprint-label h-8 text-right">
                {metric.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.suppliers.map((supplier) => (
            <TableRow
              key={supplier.id}
              className="border-[var(--blueprint-rule)] hover:bg-[var(--blueprint-grid)]"
            >
              <TableCell className="font-mono text-xs">{supplier.id}</TableCell>
              {view.metrics.map((metric) => {
                const fact = supplier.values.find((value) => value.metric === metric.key)
                return (
                  <TableCell key={metric.key} className="text-right tabular-nums">
                    {fact ? formatValue(fact.value, metric.unit) : "–"}
                    {fact?.level && (
                      <span
                        data-level={fact.level}
                        className="blueprint-label ml-2 data-[level=Critical]:text-[var(--blueprint-ink)] data-[level=Critical]:underline"
                      >
                        {fact.level}
                      </span>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <figcaption className="blueprint-label border-t border-[var(--blueprint-rule)] px-2 py-1.5">
        {view.source.name} / {view.suppliers.length} of {view.matchedCount} matches
      </figcaption>
    </figure>
  )
}
