# Wedding Games

A mobile-first web platform for personalized wedding games, built as a meaningful full-stack software engineering project and eventually intended for use by wedding guests.

## Project Status

**M5 - Backend Foundation & Anonymous Sessions** is the current milestone. M4
is complete.

The application includes a game-selection home page and two complete playable
games at:

```text
/games/connections/development-puzzle
/games/wordle
/games/wordle/[puzzleId]
```

See [`docs/project-status.md`](docs/project-status.md) for the active issue,
completed work, and immediate next step.

## Implemented Features

- Mobile-friendly Wedding Games home page
- Complete Connections-style gameplay, including feedback, terminal states,
  and restart behavior
- Complete Wordle-style gameplay with physical and on-screen keyboards,
  duplicate-aware evaluation, terminal states, Next Word navigation, and
  interaction polish
- Responsive, keyboard-accessible interactions and reduced-motion support
- Dynamic Connections and Wordle puzzle routes
- Game-specific local puzzle content behind asynchronous loading boundaries
- Separate production content and automated test fixtures
- Pure Connections and Wordle domain rules independent from React
- Game-specific React gameplay controllers
- Unit, component, and cross-browser end-to-end test coverage
- Reproducible local Supabase/PostgreSQL migrations, deterministic Event seed
  data, Event-scoped Player schema, row-level security, and pgTAP tests

## Goals

- Build personalized games inspired by games we enjoy playing together
- Support multiple game types through an extensible architecture
- Provide persistent player identity, scoring, and leaderboards
- Create a simple mobile-first experience for wedding guests
- Apply production-oriented software engineering practices without overengineering for the expected scale

## Planned Features

- Personalized production puzzle content
- Anonymous player sessions
- Persistent attempts and scores
- Server-authoritative competitive gameplay
- Leaderboards
- Additional game types when concrete requirements justify shared platform
  abstractions

## Tech Stack

- **Language:** TypeScript
- **Application:** Next.js 16 App Router and React
- **Styling:** Tailwind CSS
- **Testing:** Vitest, React Testing Library, and Playwright
- **Hosting:** Vercel
- **Database:** PostgreSQL through Supabase, currently established as a local
  migration and testing foundation
- **CI/CD:** GitHub Actions and Vercel previews

## Architecture

Connections and Wordle each have separate content, domain, controller, and
view layers. Dynamic routes load puzzles through game-specific boundaries and
pass validated puzzle data into their respective UIs. The project deliberately
does not use a universal game-engine, repository, or game-registry abstraction.
`GamePageShell` and `GameCard` are intentionally narrow shared application
components. Game content, domains, controllers, boards, loaders, and routes
remain game-specific.

The approved M5 direction uses Supabase anonymous Auth identity, a separate
event-scoped Player, and a server-configured current Event. M5 preserves replay
and keeps attempts, scoring, and server-authoritative gameplay deferred.
The current implementation is local-only: application Auth, trusted Event
resolution, Player bootstrap, hosted Supabase, and puzzle persistence have not
yet been integrated.

See [`docs/architecture.md`](docs/architecture.md) for the broader system
direction and [`docs/adr/`](docs/adr/) for accepted architectural decisions.

## Documentation

- [`docs/project-status.md`](docs/project-status.md) - current milestone and
  progress
- [`docs/requirements.md`](docs/requirements.md) - product and system
  requirements
- [`docs/architecture.md`](docs/architecture.md) - architecture and component
  boundaries
- [`docs/security.md`](docs/security.md) - trust boundaries, security
  invariants, and pre-persistence decisions
- [`docs/development.md`](docs/development.md) - local setup, validation, and
  deployment workflow
- [`docs/adr/`](docs/adr/) - architecture decision records

## Development

Local development setup and commands are documented in
[`docs/development.md`](docs/development.md).

## Testing

The project currently uses Vitest for unit testing and Playwright for
browser-level end-to-end testing. See
[`docs/development.md`](docs/development.md) for commands and workflow details.

## Deployment

The application is deployed through Vercel with automatic pull request
preview deployments and production deployments from `main`.

Temporary production URL:
https://wedding-games-ten.vercel.app/

## Roadmap

- **M1 - Connections Prototype:** complete
- **M2 - Production Game Structure:** complete
- **M3 - Wordle Prototype:** complete
- **M4 - Multi-Game Architecture & Product Readiness:** complete
- **M5 - Backend Foundation & Anonymous Sessions:** in progress
- **Later milestones:** server-authoritative competitive play, answer
  protection, scoring, leaderboards, and additional games

Shared game infrastructure will be generalized only after multiple game
implementations demonstrate a concrete shared need.

## License

License selection is pending.
