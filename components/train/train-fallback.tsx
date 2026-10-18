import Image from "next/image";

export function TrainFallback({ loading = false }: { loading?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" role="status">
      <Image
        src="/models/high-speed-train-preview.png"
        alt="Blueprint illustration of a modern three-car high-speed train"
        fill
        sizes="(max-width: 640px) 100vw, 85vw"
        className="object-contain mix-blend-screen invert"
      />
      <p className="blueprint-label absolute inset-x-0 bottom-6 text-center">
        {loading ? "Preparing the train view…" : "Static train preview"}
      </p>
    </div>
  );
}
