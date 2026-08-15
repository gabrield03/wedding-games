# ADR-0002: Use PostgreSQL via Supabase for Initial Persistence

## Status

Accepted

## Date

2026-08-14

## Context

Wedding Games requires persistent storage for application data including:

- Players
- Games
- Puzzles
- Attempts
- Moves
- Scores
- Leaderboard data

The expected relationships among these entities are naturally relational.

For example:

```text
Player
   |
   +-- Attempt
          |
          +-- Puzzle
                 |
                 +-- Game
```

The project also benefits from using a database technology that provides meaningful backend engineering experience while remaining practical for a single-developer application with a small expected user population.

Operating and maintaining a self-hosted production database would add infrastructure and operational complexity that is not currently justified.

## Decision

Use PostgreSQL as the initial relational database.

Use Supabase as the initial managed PostgreSQL platform for development and production database hosting.

Application code should interact with PostgreSQL through a defined persistence layer rather than allowing Supabase-specific behavior to spread throughout the application.

Supabase should be treated primarily as infrastructure providing managed PostgreSQL rather than as the core application architecture.

## Rationale

PostgreSQL was selected because:

- The application domain contains clear relationships among players, puzzles, attempts, and scores
- Relational constraints can help maintain data integrity
- SQL provides flexible querying for leaderboards and reporting
- PostgreSQL is widely used and well documented
- Schema migrations provide a structured approach to evolving the data model
- The technology provides useful experience with relational database design and SQL

Supabase was selected as the initial PostgreSQL provider because:

- It reduces database provisioning and operational overhead
- It provides managed PostgreSQL without requiring the application to operate its own database infrastructure
- It supports normal PostgreSQL concepts and tooling
- It allows the project to begin with a simple deployment architecture
- The underlying relational model is less tightly coupled to the provider than a proprietary database model would be

## Alternatives Considered

### Self-Hosted PostgreSQL

Running PostgreSQL directly on a virtual machine or container would provide additional operational control.

It was not selected because database administration, backups, availability, patching, and infrastructure management would add complexity without solving a current product requirement.

### Amazon RDS for PostgreSQL

Amazon RDS would provide managed PostgreSQL and align with technologies used in professional AWS environments.

It was not selected initially because the project does not currently need the additional AWS infrastructure and configuration associated with that deployment model.

RDS remains a reasonable future option if the project moves toward a broader AWS architecture.

### DynamoDB

DynamoDB could store the application's persistent state and provide highly scalable managed storage.

It was not selected because the application does not require extreme scale, and the domain is naturally relational.

Using DynamoDB would also require designing access patterns and denormalized data structures primarily to support a scale requirement that does not currently exist.

### Firebase

Firebase could provide managed persistence and client-facing application services with relatively low setup overhead.

It was not selected because PostgreSQL and SQL better match the current domain model and provide more relevant experience with relational data modeling.

### SQLite

SQLite would be sufficient for early local prototypes and could simplify initial development.

It was not selected as the primary persistence technology because the application is expected to support deployed multi-user access and persistent production data.

SQLite may still be useful in isolated tests or local tooling if appropriate.

## Consequences

### Positive

- The project gains a relational data model with foreign keys and constraints.
- SQL can be used for leaderboard and reporting queries.
- Database schema evolution can be tracked through migrations.
- Managed hosting reduces operational overhead.
- PostgreSQL knowledge remains transferable if the database provider changes.
- The persistence layer can support future relationships such as guest identities, teams, or scheduled puzzle releases.

### Negative

- The application depends initially on an external managed database provider.
- Database migrations must be maintained carefully.
- Local and production database environments require configuration.
- Provider-specific features could create unnecessary coupling if used throughout the application.
- Relational schema changes may require migration planning as requirements evolve.

## Data Access Boundary

Application code should avoid direct database access from arbitrary UI components.

The intended dependency direction is:

```text
UI / Route Handler
        |
        v
Application Service
        |
        v
Persistence Interface
        |
        v
PostgreSQL
```

This separation should make business logic easier to test and reduce the impact of changing database access technologies later.

For example, game scoring logic should not depend directly on a Supabase client.

Instead:

```text
Score Service
    |
    +-- calculate score
    |
    +-- save result through persistence layer
```

## Schema Management

Database schema changes should be represented through version-controlled migrations.

Production schema changes should not depend on manually remembering SQL commands executed through a provider dashboard.

The repository should eventually contain a migration history similar to:

```text
supabase/
└── migrations/
    ├── 0001_create_players.sql
    ├── 0002_create_games.sql
    ├── 0003_create_puzzles.sql
    └── 0004_create_attempts.sql
```

Exact migration naming conventions may change when database tooling is configured.

## Security Considerations

Production database credentials and connection information must not be committed to source control.

The application server should control access to sensitive game data such as unpublished puzzle solutions and authoritative score state.

Direct client access to database resources should be limited to explicitly approved use cases.

PostgreSQL and Supabase security capabilities may be used where appropriate, but application-level authorization and validation remain necessary.

## Revisit Conditions

This decision should be reconsidered if:

- Supabase introduces limitations that materially affect development or deployment
- The application moves to a broader AWS infrastructure strategy
- Operational requirements justify using another managed PostgreSQL provider
- The persistence model changes substantially enough that a relational database is no longer appropriate
- Provider-specific dependencies make migration unnecessarily difficult
- Cost, reliability, or availability requirements change significantly

Changing database providers would not necessarily require changing the decision to use PostgreSQL.

If either the database technology or provider changes materially, a new ADR should supersede the relevant portion of this decision.
