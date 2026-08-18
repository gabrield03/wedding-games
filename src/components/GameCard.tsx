import Link from "next/link";

type GameCardProps = {
  title: string;
  actionLabel: string;
  href: string;
  prefetch?: boolean;
};

export function GameCard({
  title,
  actionLabel,
  href,
  prefetch,
}: GameCardProps) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-neutral-100 p-5 text-left text-neutral-950">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link
        href={href}
        prefetch={prefetch}
        className="mt-4 inline-flex rounded-full border border-neutral-800 px-4 py-2 font-semibold transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
