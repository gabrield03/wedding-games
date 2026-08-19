# Security and Trust Boundaries

## Purpose and Current Posture

This document records the security model that must guide persistence work for
Wedding Games. The current prototype has no database, API, player sessions,
administrative operations, uploads, or authoritative persisted results.
Connections solutions and Wordle answers are currently delivered to browser
JavaScript. That exposure is an accepted limitation for prototype play, but it
is not suitable for future trusted competition.

The product currently operates as one implicit wedding/event. Multi-tenancy is
not being implemented now. M5 will introduce `Event` as an explicit ownership
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
launch, but are not implemented by M5 Issue 1.

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
- Keep application authorization in server-side code with database policies
  and constraints as defense in depth.
- Treat complete puzzle solutions sent to current client gameplay as a
  transitional M5 limitation; M6 owns authoritative play and answer protection.

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
- Exact Supabase SSR cookie/session integration
- Whether any operation requires a privileged server-only Supabase client
- Cross-device recovery and account-linking behavior
- Future attempt, scoring, and replay-eligibility rules
- Final anonymous-user cleanup and CAPTCHA approach
