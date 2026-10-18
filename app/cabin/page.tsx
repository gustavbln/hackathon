import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/chat-dock";
import { CabinScene } from "@/components/train/cabin-scene";

export const metadata: Metadata = {
  title: "Passenger cabin | ComplyDo Solutions",
  description: "Explore the high-speed train cabin and select a seat.",
};

export default function CabinPage() {
  return (
    <ChatWorkspace>
      <CabinScene />
    </ChatWorkspace>
  );
}
