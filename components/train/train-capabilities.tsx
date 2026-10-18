import { Building2, Clock3, ShieldCheck } from "lucide-react";

const capabilities = [
  {
    title: "Supplier management",
    description: "Compare. Shortlist. Decide.",
    icon: Building2,
    position: "left-0 top-[26%] sm:left-[2%] sm:top-[43%] lg:left-[5%]",
  },
  {
    title: "Risk assessment",
    description: "See the risk behind every part.",
    icon: ShieldCheck,
    position: "right-0 top-[26%] sm:right-[2%] sm:top-[29%] lg:right-[5%]",
  },
  {
    title: "Just-in-time planning",
    description: "Keep production moving.",
    icon: Clock3,
    position: "bottom-[9%] left-1/2 -translate-x-1/2 sm:bottom-[15%] sm:left-auto sm:right-[5%] sm:translate-x-0 lg:right-[10%]",
  },
];

export function TrainCapabilities() {
  return (
    <ul aria-label="Platform capabilities" className="pointer-events-none absolute inset-0 z-10">
      {capabilities.map(({ title, description, icon: Icon, position }, index) => (
        <li key={title} className={`absolute w-44 max-w-[46%] text-center sm:w-52 ${position}`}>
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full border border-[var(--blueprint-rule)] bg-[var(--blueprint-paper-deep)] sm:size-12">
            <Icon className="size-[18px] sm:size-5" strokeWidth={1.25} aria-hidden="true" />
          </div>
          <p className="mb-1.5 font-mono text-[9px] tracking-[0.2em] text-[var(--blueprint-muted)]" aria-hidden="true">0{index + 1}</p>
          <h2 className="text-sm font-medium tracking-tight sm:text-base">{title}</h2>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--blueprint-muted)] sm:text-xs">{description}</p>
        </li>
      ))}
    </ul>
  );
}
