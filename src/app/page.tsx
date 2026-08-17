import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <section>
        <h1 className="text-center text-3xl font-bold">Wedding Games</h1>

        <p className="mt-2 text-center text-neutral-600">
          Choose a game to play.
        </p>

        <Link
          href="/games/connections/development-puzzle"
          className="mt-8 block rounded-lg border border-neutral-300 bg-neutral-100 p-5 text-neutral-950 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          <h2 className="text-xl font-bold">Connections</h2>
          <p className="mt-2 text-neutral-700">
            Find groups of four related items.
          </p>
          <p className="mt-4 font-semibold">Play Connections</p>
        </Link>
      </section>
    </main>
  );
}
