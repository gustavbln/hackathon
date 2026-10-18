"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatDock } from "@/components/chat/chat-dock";
import { useChatFocus } from "@/components/chat/chat-focus";
import type { SeatFocus } from "@/lib/chat-contract";

interface DetailShellProps {
  backHref: string;
  section: string;
  /** What the assistant should answer about while this page is open; null when no seat is known. */
  focus: SeatFocus | null;
  children: ReactNode;
}

/** Shared frame for the driver and supplier detail pages, matching the cabin's header. */
export function DetailShell({ backHref, section, focus, children }: DetailShellProps) {
  const { setFocus } = useChatFocus();
  const focusKey = JSON.stringify(focus);

  useEffect(() => {
    setFocus(focusKey === "null" ? null : (JSON.parse(focusKey) as SeatFocus));
  }, [focusKey, setFocus]);

  return (
    <main className="blueprint-page relative flex min-h-svh min-w-0 flex-1 flex-col px-5 pb-12 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--blueprint-rule)] py-6">
        <Link href={backHref} className="flex min-h-9 items-center gap-2 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to seat sourcing
        </Link>
        <div className="flex items-center gap-6">
          <span className="blueprint-label hidden sm:block">{section}</span>
          <ChatDock />
        </div>
      </header>
      {children}
    </main>
  );
}
