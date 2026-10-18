import type { Metadata } from "next";

import { ChatWorkspace } from "@/components/chat/chat-dock";
import { ResearchWorkspace } from "@/components/financial/research-workspace";

export const metadata: Metadata = {
  title: "Financial research | ComplyDo Solutions",
  description: "Research a real seat maker: financial screening score, company group and the evidence behind them.",
};

export default async function FinancialPage({ searchParams }: PageProps<"/financial">) {
  const { run } = await searchParams;
  return (
    <ChatWorkspace>
      <ResearchWorkspace initialRunId={typeof run === "string" ? run : null} />
    </ChatWorkspace>
  );
}
