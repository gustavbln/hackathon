import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Hackathon</h1>
      <Button>Let&apos;s build</Button>
    </main>
  );
}
