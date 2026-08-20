# Security and Trust Boundaries

## Purpose and Current Posture

This document records the security model that must guide persistence work for
Wedding Games. The application now has a database, anonymous Auth/Player
bootstrap API, and event-scoped Connections and Wordle content, but it has no
administrative operations, uploads, or authoritative persisted results.
Connections solutions and Wordle answers are still delivered to browser
JavaScript. That exposure is an accepted limitation for prototype play, but it
is not suitable for future trusted competition.

The product currently operates as one implicit wedding/event. Multi-tenancy is
not being implemented now. M5 introduced `Event` as an explicit ownership
concept so that globally owned data is not an accidental property of the first
backend.

## Trust-Boundary Overview

```text
Untrusted browser
  -> Supabase anonymous Auth cookies
     -> Next.js/server boundary
        -> verified identity + trusted Event + event-scoped Player
           -> game-specific data access
              -> event-scoped PostgreSQL storage
```

- The browser supplies actions and selectors, but is not authoritative for
  identity, authorization, game outcomes, or scores.
- Next.js Proxy may refresh and propagate Auth cookies but does not authorize
  application operations.
- Server-side application/data-access code verifies identity, establishes
  trusted Event context, validates input, authorizes access, and controls what
  data crosses back to the browser.
- Game-specific authoritative logic evaluates actions and derives results when
  persistence or competition requires trusted outcomes.
- Future storage enforces event ownership for both reads and writes, with
  database controls providing defense in depth behind application checks.

## Security Invariants

1. The server establishes trusted event context. Client-provided event IDs,
   slugs, route parameters, cookies, or body values may select resources but do
   not establish authorization by themselves.
2. Persisted event-owned application data has explicit event scope, including
   puzzles, content, Players, attempts, scores, leaderboards, reaction assets,
   and administrative permissions. Provider-managed Auth identity/session data
   remains separate from event participation.
3. Session identity and authorization are separate. A valid anonymous session
   does not authorize access to every event or to administrative actions.
4. When results become authoritative or competitive, the browser submits
   actions rather than outcomes. Completion, mistakes, timing, scores, and
   leaderboard results are calculated or verified from server-controlled
   state.
5. Opaque identifiers reduce accidental discovery but never replace
   authorization.
6. Public responses do not expose private or unpublished puzzle solutions,
   private assets, privileged internal data, or secrets unless explicitly
   required.
7. Anything intentionally delivered to browser JavaScript is not a secret.
8. External input is validated and resource-bounded before use.

## Event Isolation

Event A must never receive Event B's protected puzzles, attempts, scores,
assets, or administrative data. Event scope applies to reads and writes. A
client-provided event identifier can help select a resource, but cannot prove
that the requester may access it.

The current one-wedding product does not require multi-tenant behavior. It does
require explicit ownership in the first persistent model so that a future
deployment choice does not depend on invisible global assumptions.

## Anonymous Identity and Players

Supabase Auth anonymous sign-in provides the browser/device-bound identity and
managed session. The application does not create a duplicate custom Session
table.

An event-scoped Player represents that identity's participation in one Event.
Identity and event authorization remain separate: a valid Auth identity does
not authorize every Event or any administrative action.

Player bootstrap is silent in M5 and does not require a display name. Identity
also remains separate from attempts, completion, scoring, and leaderboard
eligibility. Recognizing a returning browser must not block replay or require
developers to clear cookies after testing a puzzle.

Anonymous-user accumulation and signup abuse are production concerns. CAPTCHA,
rate-limit protection, and cleanup must be evaluated before broad public guest
launch, but are not implemented by M5. The higher anonymous-signup allowance in
the committed local Supabase configuration exists only for cross-browser tests
and retries; it does not establish hosted policy.

## Server-Authoritative Gameplay

When persistence, scoring, or competition matters, the client submits actions
such as a Connections selection or Wordle guess. Server-controlled logic loads
the relevant attempt and puzzle, evaluates the action, and derives completion
and scoring outcomes. The server must not accept claims such as a final score,
win, mistake count, or elapsed time as authoritative without verification.

Current client-side Connections solution data and Wordle answer exposure are
acceptable for prototype play. Future trusted competition requires private
solution data and authoritative evaluation to remain behind the server
boundary until disclosure is appropriate.

## Identifiers

Current puzzle IDs are public prototype lookup identifiers. Opaque IDs can make
casual discovery harder, but do not grant access. M5 scopes public puzzle IDs
by Event and game and keeps them conceptually distinct from internal database
identifiers. Current public URLs do not need to change.

## Personalized Reaction Assets

Future personalized reaction images require decisions about:

- Event ownership
- Authorization to upload, replace, or delete an asset
- Validation of actual image content rather than filename or extension alone
- File-size and image-dimension bounds
- Removal of sensitive metadata
- Public versus private visibility
- Cleanup and deletion behavior

This document does not choose an upload service or design upload
infrastructure.

## Secrets

Values delivered to browser JavaScript are public, even if they originate from
server configuration. Privileged database credentials, service-role keys,
session-signing material, payment secrets, and administrative credentials must
remain server-only and must not be committed to source control.

Local development and CI use only credentials created by the disposable local
Supabase stack. GitHub Actions masks its ephemeral local secret before making
it available to later E2E/build steps and does not receive the hosted Supabase
secret key, hosted database password, or Vercel secrets. `.env.local` remains
ignored, while `.env.example` contains placeholders only.

The local publishable key and URL are browser-safe. The local secret key has
elevated access even though the database is disposable and must not be copied
into shared logs, artifacts, or browser code. Hosted migration/content
operations remain manual and use developer-controlled linked-project
credentials outside CI.

## Accepted M5 Direction

- Model `Event` as a first-class persistent owner while operating one current
  wedding.
- Resolve the current Event from server-owned configuration such as
  `CURRENT_EVENT_SLUG`.
- Use Supabase anonymous Auth identity plus a separate event-scoped Player.
- Scope public puzzle identifiers by Event and game while keeping them separate
  from internal database IDs.
- Persist Event, Player, Connections content, and Wordle content in M5 through
  game-specific persistence.
- Use authenticated request-scoped access and RLS by default. Do not require a
  privileged Supabase client without a concrete operation that needs it.
- Treat the Issue 3 secret-key client as a narrow exception for trusted Event
  resolution and Player insert/select only. The credential is elevated and
  RLS-bypassing, not generally least-privileged.
- Keep application authorization in server-side code with database policies
  and constraints as defense in depth.
- Treat complete puzzle solutions sent to current client gameplay as a
  transitional M5 limitation; M6 owns authoritative play and answer protection.

## Implemented Issue 2 Database Posture

The local PostgreSQL foundation now makes Event ownership explicit:

- `players.event_id` references `events.id` with Event deletion restricted.
- `players.auth_user_id` references `auth.users.id` with Auth-user deletion
  cascading to the associated Player rows.
- `unique(event_id, auth_user_id)` prevents duplicate participation records
  within one Event without globally restricting an Auth identity to one Event.
- Both public application tables have RLS enabled and explicit client
  privileges.
- Events have no direct `anon` or `authenticated` client access.
- Authenticated identities may select only Player rows whose
  `auth_user_id = auth.uid()`.
- Client roles cannot insert, update, or delete Players.

## Implemented Issue 3 Trust Boundary

Issue 3 retains the Issue 2 client restrictions and adds a narrow server-side
bootstrap path:

- A browser client may create or reuse only its Supabase anonymous Auth
  session using the public project URL and publishable key.
- Next.js Proxy refreshes Auth cookies only on game and bootstrap routes. It
  performs no Event resolution, Player creation, or authorization.
- `POST /api/player/bootstrap` derives `auth_user_id` exclusively from verified
  Supabase claims and accepts no identity/Event/Player selector from the
  browser.
- A server-only resolver derives `event_id` exclusively from
  `CURRENT_EVENT_SLUG` and returns only the Event ID and slug.
- An isolated plain `@supabase/supabase-js` client uses
  `SUPABASE_SECRET_KEY` only to select Events and insert/select Players.
- The endpoint returns `204` without internal IDs. Invalid identity returns
  `401`; configuration/database failures return a safe `503`.
- Conflict-ignore followed by exact-pair selection and
  `unique(event_id, auth_user_id)` make repeated/concurrent bootstrap
  idempotent.

The secret key remains an elevated RLS-bypassing backend credential. Explicit
`service_role` grants limit these tables to Event `SELECT` and Player
`SELECT`/`INSERT`, but those grants do not make the credential itself generally
least-privileged. Protection depends on server-only storage, module isolation,
trusted inputs, narrow operations, and never exposing the key through browser
code, responses, logs, or committed files.

The local seed's `isolation-test` Event exists only to exercise ownership and
RLS assumptions. It is not a second production wedding. No credentials,
service-role keys, Auth users, or Players are committed as seed data.

## Implemented Issue 4 Connections Content Boundary

Connections puzzle rows have explicit `event_id` ownership and public IDs that
are unique only within an Event. The production loader accepts a public puzzle
ID from the route but establishes Event scope exclusively through the trusted
server resolver, then queries the exact `(event_id, public_id)` pair. A public
ID therefore selects within trusted scope; it never establishes scope or
authorization.

The table has RLS enabled with no `anon` or `authenticated` access. The
isolated secret client receives only `SELECT` on Connections puzzles; it has no
content mutation grants. Stored JSON is decoded at the server boundary and
then checked by the existing Connections domain validator before it reaches
the UI. Missing rows remain distinct from database failures and invalid stored
content.

The current board still receives the complete validated solution for
client-side play. Database storage and opaque/internal identifiers do not make
that browser-visible answer secret. Server-authoritative attempts and answer
protection remain M6 work.

## Implemented Issue 5 Wordle Content Boundary

Wordle puzzle rows have explicit Event ownership and public IDs unique only
within an Event. Direct loading derives Event scope from the trusted server
resolver and queries the exact `(event_id, public_id)` pair. Request-time
selection also resolves that Event internally and reads only its public puzzle
IDs. The browser-provided `exclude` value can remove an immediate candidate;
it cannot select or authorize an Event.

The Wordle table has RLS enabled with no `anon` or `authenticated` access. The
isolated secret client has `SELECT` only and runtime content mutation remains
disallowed. Canonical uppercase answer constraints and application domain
validation prevent malformed persisted answers from reaching gameplay.

The complete answer is still serialized to `WordleGameBoard`. PostgreSQL
persistence therefore does not hide it, and client-computed outcomes are not
authoritative. M6 remains responsible for server-side attempt evaluation and
answer protection.

## Safely Deferred Decisions

- Multi-event URL structure
- Custom domains
- A shared multi-event SaaS deployment
- Cross-event accounts
- Traditional user authentication
- Administrative UI
- Payment model
- Upload implementation and vendor
- Exact rate limits
- Final row-level-security policy syntax
- Final data-retention policy
- Cross-device recovery and account-linking behavior
- Future attempt, scoring, and replay-eligibility rules
- Final anonymous-user cleanup and CAPTCHA approach
