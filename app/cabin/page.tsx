import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { CabinScene } from "@/components/train/cabin-scene";
import { parseWeights } from "@/lib/suppliers/profiles";

export const metadata: Metadata = {
  title: "Passenger cabin | ComplyDo Solutions",
  description: "Explore the high-speed train cabin and select a seat.",
};

export default async function CabinPage({ searchParams }: PageProps<"/cabin">) {
  const { seat, w } = await searchParams;
  return (
    <ChatWorkspace>
      <CabinScene initialSeatId={typeof seat === "string" ? seat : null} initialWeights={parseWeights(w)} />
    </ChatWorkspace>
  );
}
