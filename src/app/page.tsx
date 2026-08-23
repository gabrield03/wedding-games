import { GameCard } from "@/components/GameCard";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <section>
        <h1 className="text-center text-3xl font-bold">Wedding Games</h1>

        <p className="mt-2 text-center text-neutral-600">
          Choose a game to play.
        </p>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <GameCard
            title="Connections"
            actionLabel="Play Connections"
            href="/games/connections/development-puzzle"
          />

          <GameCard
            title="Wordle"
            actionLabel="Play Wordle"
            href="/games/wordle"
            prefetch={false}
          />

          <GameCard
            title="Strands"
            actionLabel="Play Strands"
            href="/games/strands"
            prefetch={false}
          />
        </div>
      </section>
    </main>
  );
}
