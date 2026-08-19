# ADR-0005: Use Supabase Anonymous Auth with Event-Scoped Players

## Status

Accepted

## Date

2026-08-18

## Context

Wedding Games needs a low-friction way to recognize a returning browser and to
give future persisted gameplay data a stable owner. Traditional account
registration remains unnecessary for the current wedding audience.

ADR-0003 selected anonymous player sessions and described an application-owned
opaque session token, custom session record, secure cookie, and separate Player
record. Supabase now provides anonymous Auth users, managed sessions, and
cookie-based Next.js integration. Using those capabilities avoids implementing
and securing a second session system alongside the selected database platform.

The application also needs to preserve distinctions among:

- Authentication identity
- Participation in a particular wedding/event
- Individual gameplay attempts
- Completion and score eligibility

Recognizing a browser must not accidentally introduce one-play restrictions or
make normal development replay difficult.

## Decision

Use Supabase Auth anonymous sign-in for the initial browser/device-bound
identity.

Create a separate application `Player` associated with both the Supabase Auth
user and the current `Event`. The Player represents participation in one event
and is the future owner of event-scoped attempts, results, and profile data.

Conceptually:

```text
Supabase Auth identity
  -> identifies a browser/session

Event-scoped Player
  -> represents participation in one Event

Future Attempt/Result
  -> represents one gameplay record owned by the Player
```

M5 will not create a duplicate custom Session table. Supabase Auth owns the
authentication user and session lifecycle.

The initial Player schema will omit a display name. M5 will silently create or
reuse an event-scoped Player without requiring guest interaction. Display
names or other profile presentation may be added when a concrete leaderboard
or player-name requirement exists.

## Identity and Authorization

A valid Supabase Auth identity answers which anonymous browser identity is
making a request. It does not by itself authorize access to every Event or to
administrative operations.

Server-side application code must:

1. Verify the anonymous Auth identity.
2. Resolve the trusted current Event independently.
3. Create or resolve the Player for that Auth identity and Event.
4. Authorize the requested operation within that event context.

Database constraints and row-level security provide defense in depth. Exact
RLS policy syntax remains an implementation decision.

## Next.js Session Boundary

Next.js Proxy may support the Supabase SSR cookie and token-refresh lifecycle.
It is not the application's authoritative authorization boundary.

Authorization remains the responsibility of server-side application and
data-access code, supported by database policies and constraints.

M5 Issue 3 implements the cookie lifecycle with `@supabase/ssr`. A narrowly
matched Next.js Proxy refreshes cookies for game and Player-bootstrap routes
only. A games-level client component reuses or creates the anonymous session,
then calls a server Route Handler which verifies identity with `getClaims()`.

Because authenticated clients cannot read Events or insert Players, Issue 3
also introduces an isolated server-only Supabase secret client for trusted
Event resolution and Player insert/select. This elevated, RLS-bypassing
credential is a narrow exception rather than the default data-access pattern.
The endpoint accepts no client identity/Event/Player selectors and returns no
internal IDs.

## Replay and Gameplay

Anonymous identity exists to recognize a returning browser and provide stable
ownership. It does not mean:

- A Player may open a game only once.
- A Player may play a puzzle only once.
- Completion permanently consumes access to a game.
- Replay is disallowed after a win or loss.

M5 does not persist attempts, completion history, scores, or leaderboard
eligibility. Existing Connections replay and Wordle next-puzzle behavior remain
unchanged.

Future scoring design must distinguish the ability to play or practice from
whether a particular attempt is eligible for official scoring or leaderboard
inclusion. That attempt/result model is outside this decision.

## Rationale

Supabase anonymous Auth is preferred over a custom opaque-session system
because it provides:

- Managed anonymous Auth identities and session lifecycle
- Server-verifiable identity
- Integration with PostgreSQL row-level security
- Cookie-based Next.js SSR support
- A future path to link a permanent identity
- Less custom session, token, rotation, revocation, and cleanup code

The separate Player keeps provider-owned authentication concerns out of the
application's event participation model. It also avoids putting application
profile or future leaderboard data into Supabase Auth metadata.

## Alternatives Considered

### Application-Owned Opaque Session

The application could generate a random token, store a hash in a custom
session table, set an HttpOnly cookie, and resolve it on every request.

This remains viable but was not selected because it would duplicate Supabase
session capabilities, require custom lifecycle/security work, and integrate
less naturally with row-level security.

### Display-Name Onboarding

The application could require a display name before creating a Player.

This was not selected for M5 because identity persistence does not currently
need guest-facing profile data. Adding a form now would create product work for
a future leaderboard requirement that has not yet been implemented.

### Supabase Auth User as the Only Player Record

Application data could reference the Auth user directly without an event Player.

This was not selected because Auth identity and event participation are
different concepts. A separate Player provides explicit event ownership and
keeps future application data independent from provider-managed Auth metadata.

## Abuse and Lifecycle Considerations

Anonymous-user creation can be abused and anonymous Auth records may
accumulate. CAPTCHA, rate-limit protection, and cleanup policy must be evaluated
before broad public guest launch. Issue 1 does not implement those controls.

Anonymous identity remains primarily browser/device-bound. Clearing browser
state or changing devices may create another identity and Player. Cross-device
recovery and account linking are deferred, although Supabase Auth leaves a path
for later identity linking.

## Relationship to ADR-0003

This ADR retains ADR-0003's product decision to use low-friction anonymous
identity without traditional accounts. It supersedes and refines ADR-0003's
implementation details concerning an application-owned session token, custom
Session table, and required display-name-first flow.

ADR-0003 remains unchanged as the historical record of the earlier decision.

## Consequences

### Positive

- Guests receive persistent browser identity without onboarding friction.
- Event participation has an explicit application-owned record.
- No duplicate custom Session table is required.
- RLS can use verified Supabase Auth identity.
- Future permanent identity linking remains possible.
- Replay remains independent from identity.

### Negative

- The application depends on Supabase Auth behavior in addition to PostgreSQL.
- SSR cookie/token refresh must be integrated correctly.
- Anonymous identities may accumulate and require abuse/cleanup planning.
- Clearing browser state loses access to the prior anonymous identity.
- Auth identity alone is insufficient; every protected operation must also
  resolve event participation and authorization.

## Deferred Decisions

- Exact RLS policies
- Cross-device recovery or account linking
- Display names and other Player profile fields
- CAPTCHA, rate-limit, and anonymous-user cleanup approach
- Attempt, completion, replay-eligibility, scoring, and leaderboard rules

## Revisit Conditions

Revisit this decision if:

- Supabase anonymous Auth cannot meet deployment or session requirements.
- Cross-device recovery becomes a near-term requirement.
- Traditional accounts become necessary.
- Anonymous-user abuse becomes unacceptable.
- Provider coupling materially harms maintainability.
