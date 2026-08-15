# ADR-0003: Use Anonymous Player Sessions for Initial Identity

## Status

Accepted

## Date

2026-08-14

## Context

Wedding Games needs a way to associate gameplay activity with individual players.

The system must support:

* Persistent player identity across browser sessions
* Game attempts tied to a player
* Scores tied to a player
* Leaderboard display names
* Low-friction access for wedding guests

Traditional account registration using email addresses, usernames, and passwords would introduce unnecessary friction for the expected user population.

At the same time, purely client-side identity such as a display name stored only in local storage would not provide a sufficiently reliable server-side identity for persistent scores and attempts.

The initial system therefore needs lightweight identity without requiring formal user accounts.

## Decision

Use anonymous server-managed player sessions for the initial application.

On first use:

1. The player enters a display name.
2. The server creates a persistent player record.
3. The server creates a secure session identifier associated with that player.
4. The session identifier is stored in the browser using a secure cookie.
5. Future requests use the session to resolve the existing player.

The user will not initially create a username, password, or email-based account.

The player record and session record should remain conceptually separate.

## Expected Flow

```text
First Visit
    |
    v
Enter Display Name
    |
    v
POST Player Creation Request
    |
    v
Server Validates Input
    |
    v
Create Player Record
    |
    v
Create Session
    |
    v
Set Secure Cookie
    |
    v
Player Can Begin Gameplay
```

On later visits:

```text
Browser Request
    |
    v
Session Cookie
    |
    v
Server Resolves Session
    |
    v
Existing Player Loaded
```

## Rationale

Anonymous sessions were selected because they provide:

* Low friction for wedding guests
* Persistent server-side identity
* A clear trust boundary between client and server
* Support for attempts and leaderboards
* Experience implementing session-based identity
* A path to stronger identity mechanisms later if needed

This approach avoids requiring guests to create credentials for a relatively lightweight application.

It also avoids making the browser solely responsible for determining player identity.

## Alternatives Considered

### Username and Password Accounts

Traditional accounts would provide persistent identity across devices.

They were not selected because:

* Account creation adds unnecessary friction
* Password management adds security responsibilities
* Password recovery would need to be supported
* Most wedding guests are unlikely to need long-term accounts
* The product does not currently require strong authentication

This remains an option if requirements change substantially.

### Email Magic Links

Magic-link authentication could provide identity across devices without passwords.

It was not selected initially because:

* It requires collecting email addresses
* Email delivery introduces another external dependency
* It adds additional setup before a guest can play
* Cross-device recovery is not yet a confirmed requirement

Magic links may be reconsidered if cross-device identity becomes important.

### Wedding Guest List Integration

Players could identify themselves using the wedding guest list.

This could provide stronger identity and enable features such as party or group metadata.

It was not selected initially because:

* Guest list integration introduces privacy considerations
* Duplicate names may require additional disambiguation
* The source of guest data may need synchronization
* The game platform should not depend on wedding guest management infrastructure during early development

Guest list linking may be introduced later as an optional enhancement.

### Local Storage Only

The browser could generate and store a player identifier entirely on the client.

This would be simple but was not selected because:

* The server would have weaker control over session validity
* Client-side identity could be modified easily
* Session expiration and invalidation would be more difficult to manage cleanly
* Security-sensitive state should not rely solely on client-controlled values

Local storage may still be used for non-authoritative presentation preferences.

## Session Model

The conceptual model is:

```text
Player
  |
  +-- Session
  +-- Session
  +-- Session
```

A player may eventually support multiple sessions, even if the initial implementation creates only one session per browser.

A session should contain enough information to determine whether it is valid without exposing sensitive server state to the client.

The exact database schema will be defined during implementation.

## Cookie Requirements

The session identifier should be stored using an HTTP cookie configured appropriately for production.

Expected properties include:

* `HttpOnly`
* `Secure` in production
* Appropriate `SameSite` behavior
* Reasonable expiration
* Server-controlled session validation

The cookie should contain an opaque session identifier rather than trusted player metadata such as a score or role.

For example:

```text
session_id=<opaque random token>
```

Rather than:

```text
player_name=Gabriel
player_id=123
score=850
```

The server remains responsible for resolving the session identifier to authoritative player state.

## Display Names

Display names are user-controlled input.

The server should:

* Validate length
* Reject empty values
* Normalize input where appropriate
* Escape or safely render names in the user interface
* Prevent user input from being interpreted as HTML or executable code

The initial system does not require globally unique display names.

If duplicate names become confusing on leaderboards, an additional discriminator may be introduced later.

## Session Security

Session identifiers should be:

* Random
* Difficult to predict
* Stored securely
* Validated server-side
* Revocable if necessary

The implementation should avoid exposing internal database identifiers as authentication credentials.

A player UUID may be visible or used internally without being treated as a secret, but possession of a player UUID alone should not authorize access to that player's session.

## Cross-Device Behavior

The initial version does not guarantee that a player's identity follows them across devices or browsers.

For example:

```text
Phone Browser
    ->
Player A

Laptop Browser
    ->
Player B
```

even if the same person enters the same display name.

This tradeoff is accepted initially to preserve a low-friction implementation.

Cross-device recovery or account linking may be introduced later if it provides meaningful user value.

## Consequences

### Positive

* Guests can begin playing quickly.
* No password storage or password recovery system is required.
* Persistent attempts and scores can be tied to a server-managed player.
* The server retains control over session validity.
* The architecture can evolve toward stronger authentication if required.
* Session-based identity provides useful backend engineering experience.

### Negative

* Player identity may initially be browser-specific.
* Clearing browser cookies may cause a player to lose access to their existing identity.
* Cross-device synchronization is not automatically supported.
* Multiple people using the same browser may share a player session.
* Session lifecycle and security must still be implemented correctly.

## Future Extensions

The identity system may later support:

```text
Anonymous Player
        |
        +-- Guest List Link
        |
        +-- Email Magic Link
        |
        +-- Cross-Device Recovery
```

Any stronger identity mechanism should ideally allow existing anonymous player data to be preserved or linked where practical.

## Revisit Conditions

This decision should be reconsidered if:

* Players need reliable cross-device identity
* Wedding guest list integration becomes a product requirement
* Players need account recovery
* Personalized content requires stronger identity
* Administrative users require authenticated roles
* Anonymous sessions create unacceptable leaderboard abuse
* The application expands beyond the wedding use case

If the identity model changes materially, a new ADR should supersede this decision rather than rewriting the historical record.
