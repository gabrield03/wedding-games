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

## Current Implemented Structure

The implemented application keeps parallel, game-specific flows while sharing
the M5 Event and server infrastructure where ownership requires it:

```text
/ game hub
  -> explicit Connections entry
  -> explicit Wordle entry

/games/connections/[puzzleId] route
  -> getConnectionsPuzzle
     -> resolve CURRENT_EVENT_SLUG on the server
     -> event-scoped connections_puzzles row in PostgreSQL
     -> decode stored JSON
     -> Connections domain validation and types
  -> GamePageShell
  -> ConnectionsGameBoard
     -> useConnectionsGame
        -> pure Connections gameplay rules

/games/wordle entry route
  -> wait for an incoming request
  -> resolve CURRENT_EVENT_SLUG on the server
  -> load current-Event Wordle public IDs from PostgreSQL
  -> select an ID, optionally excluding the previous puzzle
  -> redirect to /games/wordle/[puzzleId]

/games/wordle/[puzzleId] route
  -> getWordlePuzzle
     -> resolve CURRENT_EVENT_SLUG on the server
     -> event-scoped wordle_puzzles row in PostgreSQL
     -> Wordle domain validation and types
  -> GamePageShell
  -> WordleGameBoard
     -> useWordleGame
        -> pure Wordle gameplay rules and evaluation
```

Each dynamic route owns route parameters, puzzle loading, and translating an
unknown puzzle ID into Next.js `notFound()` behavior. `GamePageShell` owns only
shared page layout and the explicit link back to the game hub. Each board
remains a game-specific view, each hook coordinates only its game's React
interaction state, and both domains contain framework-independent rules.

Application puzzle content is separate from stable test fixtures. Connections
and Wordle production content now live in separate event-owned PostgreSQL
tables. The home page links explicitly to the Connections puzzle and the
request-time Wordle selection route. Two games and two game-specific loaders
do not justify a generic game registry, repository framework, or universal
game engine.

The Wordle board receives only an opaque Next Word destination from its dynamic
route. The content layer owns random puzzle-ID selection, the entry route owns
request-time execution and redirects, and the Wordle controller and domain
remain unaware of both routing and persisted content.

Wordle evaluation currently remains client-side, and the validated puzzle
answer is passed to the client game. Server-authoritative attempts and stronger
answer protection remain deferred until persistence, scoring, or competitive
requirements justify that boundary.

## M4 Multi-Game Architecture Review

The M4 Issue 1 review confirms that Connections and Wordle should remain
independent vertical slices. Their domain rules, runtime validation, gameplay
state, React controllers, boards, content implementations, and routes are
game-specific and should evolve independently.

The following shared application decisions are currently justified:

- `GamePageShell` remains a narrow shared application abstraction for page
  layout, navigation back to the hub, and child rendering.
- `GameCard` is a narrow shared presentation abstraction for the home-page card
  container, title, and action link. The home page still owns two explicit game
  entries, their names, destinations, action labels, and Wordle prefetch
  behavior.

The following abstractions are not currently justified:

- A generic game, game engine, domain-state, or controller interface
- A generic repository or content loader implementation
- Generic Next.js game routes
- A `GameRegistry` or catalog configuration collection
- Shared gameplay-flow E2E helpers or parameterized game test suites

The asynchronous `puzzle | null` loader shape, validation of found content,
and descriptive invalid-content errors are a shared convention. They do not
require shared implementation. Future storage, availability, public/private
solution data, and attempt behavior may differ by game.

M4 Issue 4 implemented only the refactors supported by the completed reviews:

- Extracted the narrow `GameCard` without introducing a registry or metadata
  collection.
- Aligned Connections E2E production-content access with the game-specific
  `getConnectionsPuzzle` boundary.
- Added the domain-owned `CONNECTIONS_GROUP_SIZE` invariant for puzzle group
  validation, submitted-guess evaluation, and controller selection behavior.

Matching loader contracts remain a convention rather than a shared
implementation. A shared shake-animation refactor is not planned and should be
reconsidered only if future work naturally touches those animations.

## M4 Wedding and Platform Boundary Review

The M4 Issue 2 review distinguishes three conceptual boundaries:

- **Platform/application:** behavior shared regardless of which wedding uses
  the application, including the game hub, page navigation, session and
  persistence direction, and shared application presentation.
- **Game-specific:** Connections and Wordle rules, state, validation,
  controllers, boards, content shapes, selection behavior, and routes.
- **Event/wedding-specific:** data and presentation that may differ between
  weddings, including puzzle instances, answer content, enabled games,
  event-facing metadata, and personalized assets.

The current application intentionally represents one implicit event. It does
not yet resolve an event at runtime or model multiple weddings. Connections
and Wordle mechanics contain no couple identity and can be reused unchanged
with different game-owned content.

Current event-related data includes:

- Connections puzzle titles, groups, categories, and tile labels
- Wordle answer content
- The games enabled on the home page
- Event-facing presentation or metadata where it differs from the generic
  Wedding Games product

Game-owned content may conceptually belong to an event without requiring a
generic cross-game content schema. Connections and Wordle should continue to
own their different content shapes and loading behavior.

The following hardcoding remains intentional for the current stage:

- The Wedding Games product name
- Game names and play/navigation labels
- Explicit game-specific routes
- The current neutral visual theme
- Local repository-backed puzzle content

Current puzzle IDs such as `development-puzzle` and `wedding-01` through
`wedding-10` are local prototype lookup keys. They should not silently become
durable database identity without first deciding whether identifiers are
global or scoped by event and game, and whether public route slugs differ from
internal persistence IDs.

The M5 design makes Event the owner of persisted Players and game-specific
content. Future attempts, scores, leaderboards, and personalized assets must
also receive explicit Event ownership when they are designed.

Reaction-image architecture follows the same boundary:

- A reaction trigger remains game-specific, such as a Connections correct
  guess or a Wordle win.
- The actual couple photo and related content are event-owned assets.
- Temporary image presentation may become reusable only after a real
  implementation demonstrates stable shared behavior.

The M4 Issue 3 security review keeps the product operating as one event today
without selecting a final shared multi-event deployment model. M5 makes
`Event` an explicit ownership concept, resolves trusted event context from
server-owned configuration, and separates Supabase Auth identity from
event-scoped Player participation and authorization.

A separate deployment remains a reasonable model for the current wedding. No
multi-event routes, giant event configuration object, shared reaction
framework, or database design are justified by these reviews. The complete
accepted security invariants and deferred decisions are recorded in
[`docs/security.md`](security.md).

## M5 Backend Ownership and Anonymous Identity Direction

M5 introduces `Event` as the first-class owner of persisted wedding-specific
data while retaining one wedding as the current operational model. The initial
Event is resolved from server-owned configuration such as
`CURRENT_EVENT_SLUG`; client-provided event values do not establish
authorization.

The approved M5 direction is:

```text
Browser
  |
  | Supabase anonymous Auth cookies
  v
Next.js server boundary
  |
  +-- verify Auth identity
  |
  +-- resolve trusted current Event
  |     -> server-owned CURRENT_EVENT_SLUG
  |
  +-- resolve or bootstrap event-scoped Player
  |
  +-- game-specific content loaders
        |
        +-- Connections persistence
        +-- Wordle persistence
  |
  v
Supabase PostgreSQL
```

The responsibilities remain distinct:

- **Supabase Auth identity:** provider-managed, browser/device-bound anonymous
  identity and session lifecycle.
- **Application Player:** participation in one Event and the future owner of
  event-scoped gameplay/profile data.
- **Event:** owner of wedding-specific content and future persisted gameplay
  data.
- **Attempt/result:** future gameplay records separate from identity; not part
  of M5 persistence.

Player bootstrap is silent and does not require a display name. Identity does
not restrict play or replay. Connections restart and Wordle next-puzzle
behavior remain available; future scoring design must separately decide which
attempts are leaderboard-eligible.

Next.js Proxy may refresh and propagate Supabase Auth cookies. It is not the
application's authorization boundary. Server-side application/data-access code
verifies identity, resolves the trusted Event, and authorizes operations;
database constraints and RLS provide defense in depth.

Normal access uses the authenticated anonymous user's identity and RLS. M5
Issue 3 adds one narrow exception: an isolated server-only client using an
elevated Supabase secret key resolves the configured Event and inserts/selects
the corresponding Player. Normal authenticated access cannot perform those
operations because Events have no client read access and Players have no
client insert access. The secret key bypasses RLS and is not generally
least-privileged; its blast radius is reduced through server-only storage,
isolated usage, explicit table grants, and trusted server-derived inputs.

M5 persists Event, Player, Connections content, and Wordle content. Both game
loaders resolve the trusted current Event and query by exact
`(event_id, public_id)` ownership. Connections decodes its JSONB aggregate;
Wordle maps typed columns. Both apply their existing domain validators, and
only genuinely absent direct-lookups become `null`. M5 continues sending full
puzzle solutions to current client gameplay as an explicit transition; M6
owns authoritative attempts and answer protection.

These decisions are recorded in
[`ADR-0005`](adr/0005-use-supabase-anonymous-auth-with-event-scoped-players.md)
and
[`ADR-0006`](adr/0006-use-event-as-the-persistent-ownership-boundary.md).

### Implemented M5 Schema Foundation

M5 Issue 2 establishes a local, migration-owned PostgreSQL foundation:

```text
auth.users
    |
    | players.auth_user_id (on delete cascade)
    v
public.players
    |
    | players.event_id (on delete restrict)
    v
public.events
```

`events` has an internal UUID, a unique validated slug, and a creation
timestamp. `players` has an internal UUID, Event ownership, Supabase Auth-user
identity, and a creation timestamp. `unique(event_id, auth_user_id)` permits
one Auth identity to participate in multiple Events while preventing duplicate
Players within one Event.

Both public tables have RLS enabled. Events have no direct client access.
Authenticated identities may select only their own Player rows and cannot
directly insert, update, or delete Players.

### Implemented M5 Identity Bootstrap

M5 Issue 3 adds a games-scoped, non-blocking application bootstrap:

```text
/games layout client bootstrap
  -> reuse or create Supabase anonymous Auth session
  -> POST /api/player/bootstrap with cookie-backed session
  -> verify JWT claims through a request-scoped server client
  -> resolve CURRENT_EVENT_SLUG through the isolated secret client
  -> conflict-safe insert and exact-pair select of Player
```

Next.js Proxy runs only for `/games/:path*` and `/api/player/bootstrap`. It
refreshes and propagates Supabase Auth cookies but does not resolve Events,
create Players, or authorize application operations. The bootstrap endpoint
accepts no Event, Auth-user, or Player selector and returns no internal IDs.
The database's `unique(event_id, auth_user_id)` constraint remains the
concurrency and idempotency backstop.

The games remain client-playable if this transitional bootstrap is
temporarily unavailable because M5 has not made persistence authoritative.
Future persisted operations must verify identity and Event authorization at
their own server boundary rather than trusting bootstrap completion in the
browser.

The schema is reproducible through committed Supabase migrations, deterministic
local/test seed data, pgTAP tests, and generated TypeScript database types.
The anonymous Auth/Player bootstrap from Issue 3 is complete; each new
persistence slice is still replayed and validated locally before its explicit
hosted migration/data deployment.

### Implemented M5 Connections Persistence

M5 Issue 4 adds an event-owned `connections_puzzles` table:

```text
public.events
    |
    | connections_puzzles.event_id (on delete cascade)
    v
public.connections_puzzles
    -> internal UUID primary key
    -> event-scoped public_id used by existing URLs
    -> title
    -> game-specific groups JSONB
```

`unique(event_id, public_id)` keeps route identifiers local to an Event rather
than treating them as global database identity. The table has RLS enabled and
no browser policies or grants. The isolated secret client has `SELECT` only;
content mutation remains a migration/data-deployment responsibility.

The versioned current-wedding data file is separate from the base Event seed,
requires the configured Event row to exist, and upserts only that Event's
existing production puzzle. Unit/component fixtures and E2E expectations stay
independent from the server-only production loader.

### Implemented M5 Wordle Persistence

M5 Issue 5 adds an event-owned, typed `wordle_puzzles` table:

```text
public.events
    |
    | wordle_puzzles.event_id (on delete cascade)
    v
public.wordle_puzzles
    -> internal UUID primary key
    -> event-scoped public_id used by existing URLs
    -> canonical five-letter uppercase answer
```

The table has RLS enabled with no browser access; the isolated secret client
has `SELECT` only. Direct loading uses an exact trusted-Event/public-ID lookup.
The request-time selector fetches only the current Event's public IDs and
chooses in application code, excluding the previous puzzle when an alternative
exists and retaining no played history.

The ordered current-wedding data file upserts the existing ten answers only
after the base Event seed and Connections content. Test fixtures remain
independent from both server-only production content boundaries.

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

PostgreSQL now contains the Event and Player foundation plus event-owned
Connections and Wordle content. Gameplay records remain unpersisted.

Expected domain entities include:

```text
Event
Player

Connections Puzzle
Wordle Puzzle

Future:
Attempt
Result
```

Additional entities may be introduced as requirements become clearer.

Database access should be isolated from user-interface components so persistence decisions can evolve without requiring widespread changes to game presentation logic.

### Session Management

Players should be able to participate without traditional account
registration or required onboarding.

The expected initial model is:

```text
First Visit
    |
    v
Create or reuse Supabase anonymous Auth identity
    |
    v
Resolve trusted current Event
    |
    v
Create or reuse event-scoped Player
    |
    v
Future Requests Resolve Existing Player
```

Supabase Auth manages the anonymous identity and session. The application does
not create a duplicate Session table. Player profile/display-name behavior is
deferred until a concrete product requirement needs it.

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

## Future Competitive Request Flow

M5 establishes identity, event ownership, players, and content persistence but
does not persist attempts or results. A later server-authoritative gameplay
flow may look like:

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

The current trust model, security invariants, event-isolation requirements, and
M5 decisions are documented in [`docs/security.md`](security.md).

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
Bootstrap Anonymous Player
    ->
Start Puzzle
    ->
Complete Puzzle
    ->
Receive Score
    ->
View Leaderboard
```

Current testing commands and responsibilities are maintained in
`docs/development.md`.

## Known Future Questions

The following decisions are intentionally unresolved:

- Whether player identity should eventually connect to the wedding guest list
- Cross-device recovery and account-linking behavior
- Future leaderboard scoring and replay-eligibility rules
- Anonymous-user cleanup, CAPTCHA, and rate-limit approach
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
