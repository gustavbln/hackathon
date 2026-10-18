"use client";

import { GlobeIcon, MessageCircleQuestionIcon } from "lucide-react";
import { useChatFocus } from "@/components/chat/chat-focus";
import { Button } from "@/components/ui/button";

interface AskButtonsProps {
  /** The dataset question: button label and the question the assistant receives. */
  explain: { label: string; question: string };
  /** The question for web context; the button always reads "Context from the web". */
  webQuestion: string;
}

/** Hands a detail page's two follow-up questions to the assistant, which opens and answers with the page in view. */
export function AskButtons({ explain, webQuestion }: AskButtonsProps) {
  const { ask } = useChatFocus();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => ask(explain.question)}
        className="h-9 rounded-md bg-[var(--blueprint-ink)] px-4 text-[var(--blueprint-paper)] hover:bg-[var(--blueprint-ink)]/90"
      >
        <MessageCircleQuestionIcon aria-hidden="true" /> {explain.label}
      </Button>
      <Button
        variant="outline"
        onClick={() => ask(webQuestion)}
        className="h-9 rounded-md border-[var(--blueprint-rule)] bg-transparent px-4 hover:bg-[var(--blueprint-grid)]"
      >
        <GlobeIcon aria-hidden="true" /> Context from the web
      </Button>
    </div>
  );
}
