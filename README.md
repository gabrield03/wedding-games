# Wedding Games

A mobile-first web platform for personalized wedding games, built as a meaningful full-stack software engineering project and eventually intended for use by wedding guests.

## Project Status

The project is currently completing **M2 - Production Game Structure**.

The application includes a game-selection home page and a complete playable
Connections-style puzzle at:

```text
/games/connections/development-puzzle
```

See [`docs/project-status.md`](docs/project-status.md) for the active issue,
completed work, and immediate next step.

## Implemented Features

- Mobile-friendly Wedding Games home page
- Complete Connections-style gameplay, including feedback, terminal states,
  and restart behavior
- Responsive, keyboard-accessible interactions and reduced-motion support
- Dynamic Connections puzzle routes
- Local puzzle content behind an asynchronous loading boundary
- Separate production content and automated test fixtures
- Pure Connections domain rules independent from React
- Connections-specific React gameplay controller
- Unit, component, and cross-browser end-to-end test coverage

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
- **Database direction:** PostgreSQL through Supabase when persistence is added
- **CI/CD:** GitHub Actions and Vercel previews

## Architecture

Connections is organized into separate content, domain, controller, and view
layers. Routes load puzzles through a Connections-specific boundary and pass
validated puzzle data into the game UI. The project deliberately does not use
a universal game-engine abstraction.

See [`docs/architecture.md`](docs/architecture.md) for the broader system
direction and [`docs/adr/`](docs/adr/) for accepted architectural decisions.

## Documentation

- [`docs/project-status.md`](docs/project-status.md) - current milestone and
  progress
- [`docs/requirements.md`](docs/requirements.md) - product and system
  requirements
- [`docs/architecture.md`](docs/architecture.md) - architecture and component
  boundaries
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
- **M2 - Production Game Structure:** in progress
- **Later milestones:** backend persistence, anonymous sessions,
  server-authoritative competitive play, scoring, leaderboards, and additional
  games

Shared game infrastructure will be generalized only after multiple game
implementations demonstrate a concrete shared need.

## License

License selection is pending.
