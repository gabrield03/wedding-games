import Link from "next/link";
import type { ReactNode } from "react";

type GamePageShellProps = {
  children: ReactNode;
};

export function GamePageShell({ children }: GamePageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
      <nav aria-label="Game navigation">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to games</span>
        </Link>
      </nav>

      <div className="mt-6">{children}</div>
    </main>
  );
}
