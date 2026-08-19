import type { ReactNode } from "react";

import { AnonymousPlayerBootstrap } from "@/app/games/AnonymousPlayerBootstrap";

type GamesLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function GamesLayout({ children }: GamesLayoutProps) {
  return (
    <>
      <AnonymousPlayerBootstrap />
      {children}
    </>
  );
}
