import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play — KELIR",
};

// Placeholder game route. Task 7 mounts the client-only canvas here via a
// "use client" loader that calls next/dynamic with { ssr: false }.
export default function PlayPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8 text-center">
      <p>The performance is being prepared.</p>
    </main>
  );
}
