"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatDock } from "@/components/chat/chat-dock";
import { useChatFocus } from "@/components/chat/chat-focus";
import type { PageContext } from "@/lib/chat-contract";
import { encodeWeights } from "@/lib/suppliers/profiles";

interface DetailShellProps {
  backHref: string;
  section: string;
  /** What the assistant answers about while this page is open. */
  page: PageContext;
  children: ReactNode;
}

/** Shared frame for the driver and supplier detail pages, matching the cabin's header. */
export function DetailShell({ backHref, section, page, children }: DetailShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setPage, onAction } = useChatFocus();
  const pageKey = JSON.stringify(page);

  useEffect(() => {
    setPage(JSON.parse(pageKey) as PageContext);
    return () => setPage(null);
  }, [pageKey, setPage]);

  // New weights from the assistant re-rank this page through its URL, like the seat view does.
  useEffect(
    () =>
      onAction((action) => {
        if (action.type !== "set_weights") return;
        const query = new URLSearchParams(searchParams);
        query.set("w", encodeWeights(action.weights));
        router.replace(`${pathname}?${query}`, { scroll: false });
      }),
    [onAction, pathname, router, searchParams],
  );

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
