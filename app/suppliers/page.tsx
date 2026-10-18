import type { Metadata } from "next";
import { SupplierBoard } from "@/components/leaderboard/supplier-board";

export const metadata: Metadata = {
  title: "Supplier benchmark",
  description: "Every supplier ranked for the component and train you are sourcing.",
};

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const { component, train } = await searchParams;
  return (
    <main className="blueprint-page min-h-svh px-5 py-10 sm:px-10 lg:px-16">
      <SupplierBoard component={component} trainType={train} />
    </main>
  );
}
