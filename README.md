# Wedding Games

A mobile-first web platform for personalized wedding games, built as a meaningful full-stack software engineering project and eventually intended for use by wedding guests.

## Project Status

**Early Development**

The project is currently in the architecture and initial implementation phase. Features, technologies, and requirements are expected to evolve as development progresses.

## Goals

* Build personalized games inspired by games we enjoy playing together
* Support multiple game types through an extensible architecture
* Provide persistent player identity, scoring, and leaderboards
* Create a simple mobile-first experience for wedding guests
* Apply production-oriented software engineering practices without overengineering for the expected scale

## Planned Features

* Personalized puzzle games
* Anonymous player sessions
* Persistent game attempts and scores
* Server-authoritative score validation
* Overall and game-specific leaderboards
* Mobile-first responsive design
* Additional game types over time

## Tech Stack

> Final technology choices are still being evaluated and will be documented through Architecture Decision Records (ADRs).

Current direction:

* **Language:** TypeScript
* **Frontend:** React / Next.js
* **Backend:** Next.js server APIs
* **Database:** PostgreSQL
* **Database Platform:** Supabase
* **Hosting:** Vercel
* **CI/CD:** GitHub Actions
* **Testing:** Vitest, Playwright

## Architecture

Architecture documentation will be maintained in [`docs/architecture.md`](docs/architecture.md).

Major technical decisions will be documented in [`docs/adr/`](docs/adr/) using Architecture Decision Records.

## Documentation

Planned project documentation:

* `docs/requirements.md` — functional and non-functional requirements
* `docs/architecture.md` — system architecture and component responsibilities
* `docs/data-model.md` — database and domain model
* `docs/security.md` — security considerations and threat model
* `docs/testing.md` — testing strategy
* `docs/adr/` — architecture decision records

## Development

Local development instructions will be added once the initial application is bootstrapped.

## Testing

Testing instructions and coverage expectations will be documented as the application is implemented.

## Deployment

Deployment documentation will be added once development and production environments are configured.

## Roadmap

Development is organized incrementally so that architecture and product requirements can evolve as the project develops.

Initial milestones include:

1. Repository and engineering foundation
2. First game prototype
3. Reusable game engine
4. Backend and persistence
5. Server-authoritative gameplay
6. Leaderboards
7. Production deployment
8. Additional game types

See the project issues and milestones for current work.

## License

License selection is pending.
