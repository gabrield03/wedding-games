# Architecture

## Status

Version: 0.1

This document describes the current architectural direction for the Wedding Games platform.

The architecture is expected to evolve as requirements change, new game types are introduced, and implementation experience reveals better design choices.

Significant architectural decisions and changes should be documented separately through Architecture Decision Records in `docs/adr/`.

## System Overview

Wedding Games is a mobile-first web application that provides personalized games, persistent player identity, server-validated gameplay, scoring, and leaderboards.

The initial architecture uses a single full-stack web application rather than independently deployed frontend and backend services.

```text
User Browser
    |
    v
Next.js Application
    |
    +-- React User Interface
    |
    +-- Server-Side Application Logic
    |
    +-- API Route Handlers
    |
    +-- Game Validation and Scoring
    |
    v
PostgreSQL Database
```

The application is expected to be hosted on Vercel, with PostgreSQL initially provided through Supabase.

These technology choices are architectural decisions rather than permanent requirements and will be documented through ADRs.

## Architectural Goals

The architecture should:

- Provide a simple mobile-first user experience
- Support multiple independent game types
- Keep competitive game state authoritative on the server
- Separate puzzle content from game implementation
- Support persistent players, attempts, and scores
- Remain maintainable by a single developer
- Avoid unnecessary infrastructure for the expected scale
- Allow technologies and components to be replaced as requirements evolve
- Provide clear boundaries that make automated testing practical

## High-Level Components

### Web Client

The web client is responsible for:

- Rendering the user interface
- Displaying available games and puzzles
- Handling player input
- Maintaining temporary presentation state
- Sending gameplay actions to the server
- Displaying results, scores, and leaderboard data

The client must not be treated as authoritative for competitive game state or final score calculations.

### Application Server

The application server is responsible for:

- Handling HTTP requests
- Managing player sessions
- Retrieving puzzle information
- Validating gameplay actions
- Managing attempt state
- Calculating scores
- Persisting game results
- Returning leaderboard information
- Enforcing application-level authorization and validation

The initial implementation will colocate these responsibilities within the Next.js application.

A separate backend service may be introduced later if application requirements justify the additional complexity.

### Game Engines

Each game type should contain its own domain-specific gameplay logic.

Examples may include:

```text
Game Engine
    |
    +-- Connections
    |
    +-- Trivia
    |
    +-- Word Game
    |
    +-- Future Game Types
```

A game engine may be responsible for:

- Validating game-specific actions
- Determining whether an attempt is complete
- Applying game-specific scoring rules
- Interpreting game-specific puzzle data

Shared platform concerns such as player sessions, persistence, and leaderboards should remain outside individual game engines where practical.

The architecture should not attempt to create a universal abstraction for all possible games before multiple implementations demonstrate a need for one.

### Persistence Layer

PostgreSQL will initially store persistent application state.

Expected domain entities include:

```text
Player
Game
Puzzle
Attempt
Move
```

Additional entities may be introduced as requirements become clearer.

Database access should be isolated from user-interface components so persistence decisions can evolve without requiring widespread changes to game presentation logic.

### Session Management

Players should be able to participate without traditional account registration.

The expected initial model is:

```text
First Visit
    |
    v
Enter Display Name
    |
    v
Server Creates Player
    |
    v
Session Identifier Stored in Browser
    |
    v
Future Requests Resolve Existing Player
```

The exact session implementation will be defined separately through an ADR.

### Leaderboard

The leaderboard is a shared platform capability rather than a feature owned by any individual game.

Conceptually:

```text
Game Attempt
    |
    v
Server Validation
    |
    v
Score Calculation
    |
    v
Persistent Result
    |
    v
Leaderboard Query
```

The initial leaderboard should remain simple.

Real-time infrastructure should not be introduced unless a future requirement demonstrates a meaningful need for it.

## Server-Authoritative Gameplay

Competitive game state should be validated by the server.

For example:

```text
Client
    |
    | Submit Guess
    v
Server
    |
    +-- Validate Player
    +-- Load Attempt
    +-- Validate Guess
    +-- Update Attempt State
    +-- Determine Completion
    +-- Calculate Score
    |
    v
Database
```

The browser should not submit an arbitrary final score for the server to trust.

Where reasonable, unpublished puzzle solutions should also remain unavailable to the browser until required.

This does not attempt to provide high-security anti-cheat protections. The goal is to establish an appropriate trust boundary and maintain leaderboard integrity for the expected use case.

## Puzzle Content

Puzzle content should be separated from game engine implementation.

For example:

```text
Connections Engine
        +
Connections Puzzle Data
        =
Playable Connections Puzzle
```

This allows multiple puzzles to use the same implementation.

Development and automated tests may use fixture puzzle files stored in the repository.

Production puzzle content, especially unpublished solutions, may instead be stored outside the public source repository.

## Initial Request Flow

A typical gameplay flow may look like:

```text
Player Opens Application
        |
        v
Session Resolved
        |
        v
Available Games Loaded
        |
        v
Player Starts Puzzle
        |
        v
Attempt Created
        |
        v
Player Submits Actions
        |
        v
Server Validates Actions
        |
        v
Attempt Completed
        |
        v
Server Calculates Score
        |
        v
Result Persisted
        |
        v
Leaderboard Updated
```

## Deployment Architecture

The expected initial deployment model is:

```text
GitHub Repository
        |
        v
Vercel Build and Deployment
        |
        v
Next.js Application
        |
        v
Supabase PostgreSQL
```

Production and development configuration should be separated through environment variables and deployment environments.

Secrets must not be committed to source control.

## Environments

The project should eventually support at least:

### Local Development

Used for active development and automated testing.

### Preview

Used to test changes before they are merged into the production branch.

Preview deployments may be generated automatically for pull requests.

### Production

The publicly accessible wedding application.

Production data and secrets should remain isolated from development where practical.

## Expected Scale

The application is designed for a relatively small wedding guest population.

The architecture should prioritize simplicity, reliability, and maintainability rather than designing for internet-scale traffic.

The system should not introduce distributed infrastructure solely to demonstrate technical complexity.

If usage requirements change significantly, scaling decisions should be revisited and documented at that time.

## Security Boundaries

The primary initial trust boundary is between the user's browser and the application server.

The server should validate:

- Player identity and session state
- Game actions
- Attempt ownership
- Puzzle availability
- Completion state
- Score calculations

User-controlled values such as display names must not be assumed safe.

Additional security considerations will be documented in `docs/security.md`.

## Testing Boundaries

The architecture should support testing at multiple levels.

### Unit Tests

Used for isolated domain logic such as:

- Game rules
- Guess validation
- Score calculations
- Completion conditions

### Integration Tests

Used for interactions among components such as:

- API handlers
- Session logic
- Application services
- Database persistence

### End-to-End Tests

Used for complete user flows such as:

```text
Open Application
    ->
Create Player
    ->
Start Puzzle
    ->
Complete Puzzle
    ->
Receive Score
    ->
View Leaderboard
```

The detailed testing strategy will be maintained in `docs/testing.md`.

## Known Future Questions

The following decisions are intentionally unresolved:

- Exact player session implementation
- Whether player identity should eventually connect to the wedding guest list
- Exact database schema
- Whether puzzle scheduling belongs in the application or database layer
- Whether an administrative puzzle editor is worthwhile
- Whether leaderboard updates should ever require real-time communication
- Whether the backend should remain colocated with Next.js
- Whether Supabase remains the preferred database platform
- How cocktail-hour game modes may differ from normal gameplay

These should be resolved only when requirements or implementation experience justify doing so.

## Architecture Principles

1. Prefer simple solutions appropriate to the expected scale.
2. Keep the server authoritative for competitive state.
3. Separate shared platform functionality from game-specific behavior.
4. Separate puzzle data from game implementation.
5. Avoid premature abstractions.
6. Make important decisions explicit through ADRs.
7. Design for change rather than attempting to predict every future requirement.
8. Add infrastructure only when it solves a demonstrated problem.
