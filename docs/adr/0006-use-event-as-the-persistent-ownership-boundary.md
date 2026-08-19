# ADR-0006: Use Event as the Persistent Ownership Boundary

## Status

Accepted

## Date

2026-08-18

## Context

Wedding Games currently represents one wedding implicitly. Connections and
Wordle mechanics are reusable, while puzzle content and future player/gameplay
data belong to the wedding using the application.

Introducing persistence without an explicit owner would make the first Event
an invisible global assumption. Later separation would require backfilling
ambiguous rows, changing identifier constraints, rewriting authorization and
RLS policies, and auditing every query for cross-event leakage.

The current wedding remains the only required production event. M5 does not
need multi-event URLs, custom domains, a shared SaaS deployment, or event
administration.

## Decision

Introduce `Event` as a first-class persistent owner in M5.

Direct event ownership will apply to independent event-scoped records,
including:

- Application Players
- Connections puzzle content
- Wordle puzzle content
- Future attempts, results, leaderboards, and personalized assets

Subordinate records that cannot exist independently may derive event ownership
through their parent. A future high-value aggregate may also store `event_id`
directly when independent querying, constraints, or authorization justify it.
This ADR does not design those future tables.

Game rules, React controllers, boards, explicit routes, game types, and narrow
shared presentation components remain event-independent.

## Initial Trusted Event Resolution

The current Event will be selected by server-owned deployment configuration,
conceptually:

```text
CURRENT_EVENT_SLUG=current-wedding
```

Server-side application code will resolve that configured slug to the Event's
internal database identity. Missing configuration or a missing configured
Event is an operational/configuration failure rather than a user-facing 404.

Client-provided event IDs, slugs, route parameters, cookies, query parameters,
or request bodies may act as selectors in a future design, but never establish
authorization by themselves.

Next.js Proxy is not responsible for resolving or authorizing Event access.
Trusted resolution and authorization remain in server-side application and
data-access behavior, with database constraints and RLS as defense in depth.

## Identifier Scope

Database primary keys will be internal identifiers. Existing route-facing
puzzle IDs remain public lookup identifiers.

Public puzzle identifiers need to be unique only within Event and game scope:

```text
Connections: unique(event_id, public_id)
Wordle:      unique(event_id, public_id)
```

The explicit route supplies game type and trusted server configuration supplies
Event context. Current puzzle URLs do not need to change.

Opaque or hard-to-guess identifiers do not replace authorization.

## Persistence Scope

M5 will persist:

- Event
- Event-scoped Player
- Connections content through Connections-specific persistence
- Wordle content through Wordle-specific persistence

Connections and Wordle keep separate tables and loaders. Matching loader
contracts remain a convention rather than a generic repository or puzzle
schema. A Connections JSONB payload and typed Wordle columns are acceptable
different storage designs.

M5 does not persist attempts, completion history, scores, statistics, or
leaderboards. Those future records will require explicit Event ownership when
they are designed.

## Public and Private Content

M5 may continue sending complete puzzle solutions to existing client gameplay
as an explicitly transitional limitation. Persisting content does not make the
current client authoritative or protect answers already delivered to browser
JavaScript.

M6 remains responsible for server-authoritative gameplay and separating public
play data from authoritative solution data. M5 storage and loaders should avoid
making that later separation unnecessarily difficult.

## Rationale

Explicit Event ownership:

- Prevents persisted data from silently becoming global.
- Makes trusted query scope visible.
- Supports event-isolation constraints and tests now.
- Preserves the current simple one-wedding deployment.
- Leaves a future hostname or route-slug resolver possible without requiring it.
- Avoids forcing game-specific content into a generic cross-game schema.

## Alternatives Considered

### Implicit Singleton Event

All rows could be treated as globally owned because only one wedding currently
exists.

This was rejected because ownership and identifier semantics would need a risky
retrofit as soon as another Event or deployment shared the database.

### Multi-Event Routes or Hostname Resolution Now

The application could add event slugs to URLs or resolve custom domains.

This was rejected because the current product has one event. Server-configured
resolution establishes the necessary trust and ownership boundary without
implementing multi-tenancy.

### Generic Cross-Game Puzzle Table

Connections and Wordle content could share one generic puzzle payload table.

This was rejected because their data shapes and future authoritative gameplay
requirements differ. Event ownership does not require a generic content model.

## Consequences

### Positive

- Every persisted event-owned aggregate has an explicit scope.
- Current public URLs can remain stable.
- Cross-event negative tests can be written before multi-event product work.
- Future resolver mechanisms can replace server configuration behind a narrow
  boundary.
- Game-specific content models remain independent.

### Negative

- Even a one-wedding deployment must seed and resolve an Event.
- Queries and constraints must consistently include Event scope.
- Application authorization and RLS policies require deliberate event-aware
  design.
- A server configuration error can prevent event-owned content from loading.

## Deferred Decisions

- Final shared multi-event deployment model
- Multi-event route and URL structure
- Hostname/custom-domain resolution
- Event administration UI
- Exact RLS policy syntax
- Exact hosted bootstrap workflow
- Future attempt/result ownership details

## Revisit Conditions

Revisit this decision if:

- The application permanently becomes event-independent.
- A different ownership boundary better represents the product.
- Multi-event requirements reveal that the current Event model cannot provide
  adequate isolation.
