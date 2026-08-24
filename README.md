# Wedding Games

A mobile-first web platform for personalized wedding games, built as a meaningful full-stack software engineering project and eventually intended for use by wedding guests.

## Project Status

**M7 - Strands Prototype** is in its final integration issue. M6 server-authoritative gameplay for Connections and Wordle is complete.

The application includes a game-selection home page and three playable games at:

```text
/games/connections/development-puzzle
/games/wordle
/games/wordle/[puzzleId]
/games/strands
/games/strands/[puzzleId]
```

Strands currently includes five personalized puzzles. During M7 its discovered progress and most recently visited puzzle are persisted locally in the browser; server-authoritative Strands persistence is deferred to the next milestone.

See [`docs/project-status.md`](docs/project-status.md) for milestone history and project direction.

## Implemented Features

- Mobile-friendly Wedding Games home page with Connections, Wordle, and Strands entry points
- Complete Connections-style gameplay, including feedback, terminal states, restart behavior, and server-authoritative Attempts
- Complete Wordle-style gameplay with physical and on-screen keyboards, server-side accepted-word validation and duplicate-aware evaluation, terminal states, Next Word navigation, and server-authoritative Attempts
- Complete Strands-style path gameplay with tap, drag, and keyboard input; hints; spangram and theme-word discovery; replay; deterministic Next Puzzle navigation; and five personalized puzzles
- Browser-local Strands progress restoration for found answers, active hints, and the most recently visited puzzle while transient partial selections remain ephemeral
- Responsive, keyboard-accessible interactions and reduced-motion support
- Dynamic Connections, Wordle, and Strands puzzle routes
- Event-scoped Connections and Wordle content in PostgreSQL behind separate game-specific loading boundaries
- Separate production content and automated test fixtures
- Pure game-specific domain rules independent from React
- Game-specific React gameplay controllers and views
- Unit, component, and cross-browser end-to-end test coverage
- Reproducible local Supabase/PostgreSQL migrations, deterministic Event seed data, Event-scoped Player schema, row-level security, and pgTAP tests
- Silent cookie-backed anonymous Auth and idempotent event-scoped Player bootstrap
- Event- and Player-owned Connections and Wordle Attempts with authoritative server-side evaluation, optimistic concurrency, and solution-hiding browser boundaries
- CI validation of clean database reconstruction, database lint, pgTAP, and generated database-type drift using only local Supabase

## Goals

- Build personalized games inspired by games we enjoy playing together
- Support multiple game types through an extensible architecture
- Provide persistent player identity, scoring, and leaderboards
- Create a simple mobile-first experience for wedding guests
- Apply production-oriented software engineering practices without overengineering for the expected scale

## Planned Features

- Server-authoritative Strands Attempts and answer protection
- Persistent scores
- Leaderboards
- Additional game types when concrete requirements justify shared platform abstractions

## Tech Stack

- **Language:** TypeScript
- **Application:** Next.js 16 App Router and React
- **Styling:** Tailwind CSS
- **Testing:** Vitest, React Testing Library, and Playwright
- **Hosting:** Vercel
- **Database:** PostgreSQL through Supabase for Event/Player infrastructure and game-specific production content
- **CI/CD:** GitHub Actions and Vercel previews

## Architecture

Connections, Wordle, and Strands each have separate content, domain, controller, and view layers. Dynamic routes load puzzles through game-specific boundaries and pass validated puzzle data into their respective UIs. The project deliberately does not use a universal game-engine, repository, persistence framework, or game-registry abstraction. `GamePageShell` and `GameCard` are intentionally narrow shared application components.

The current implementation uses Supabase anonymous Auth identity, a separate event-scoped Player, and a server-configured current Event. Connections and Wordle content and Attempts are persisted independently in PostgreSQL and both games evaluate gameplay on the server. Strands remains browser-authoritative during M7 and uses a small Strands-specific `localStorage` boundary for per-puzzle progress and last-puzzle resume behavior. That temporary storage boundary is intentionally separate from the server-authoritative game infrastructure that will replace it in the next milestone.

See [`docs/architecture.md`](docs/architecture.md) for the broader system direction and [`docs/adr/`](docs/adr/) for accepted architectural decisions.

## Documentation

- [`docs/project-status.md`](docs/project-status.md) - current milestone and progress
- [`docs/requirements.md`](docs/requirements.md) - product and system requirements
- [`docs/architecture.md`](docs/architecture.md) - architecture and component boundaries
- [`docs/security.md`](docs/security.md) - trust boundaries, security invariants, and pre-persistence decisions
- [`docs/development.md`](docs/development.md) - local setup, validation, and deployment workflow
- [`docs/adr/`](docs/adr/) - architecture decision records

## Development

Local development setup and commands are documented in [`docs/development.md`](docs/development.md).

## Testing

The project currently uses Vitest for unit testing and Playwright for browser-level end-to-end testing. See [`docs/development.md`](docs/development.md) for commands and workflow details. Database changes are reconstructed and validated locally with `npm run db:validate`; generated types are refreshed separately with `npm run db:types`.

## Deployment

The application is deployed through Vercel with automatic pull request preview deployments and production deployments from `main`.

Temporary production URL:
https://wedding-games-ten.vercel.app/

## Roadmap

- **M1 - Connections Prototype:** complete
- **M2 - Production Game Structure:** complete
- **M3 - Wordle Prototype:** complete
- **M4 - Multi-Game Architecture & Product Readiness:** complete
- **M5 - Backend Foundation & Anonymous Sessions:** complete
- **M5.5 - Personalized Reactions:** complete
- **M6 - Server-Authoritative Gameplay:** complete
- **M7 - Strands Prototype:** in progress, final integration issue
- **Next:** server-authoritative Strands, followed by scoring and leaderboards

Shared game infrastructure will be generalized only after multiple game implementations demonstrate a concrete shared need.

## License

License selection is pending.
