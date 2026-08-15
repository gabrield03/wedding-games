# ADR-0004: Use Server-Authoritative Gameplay for Competitive State

## Status

Accepted

## Date

2026-08-14

## Context

Wedding Games will include competitive features such as:

* Puzzle completion
* Attempt tracking
* Mistake counts
* Score calculation
* Leaderboards

The browser is controlled by the user and therefore cannot be treated as a trusted source for competitive state.

A purely client-side implementation could allow a user to modify values such as:

* Final score
* Number of mistakes
* Completion status
* Attempt duration
* Puzzle answers
* Submitted results

through browser developer tools or modified network requests.

The project does not require sophisticated anti-cheat protections, but leaderboard data should be based on application state validated by the server rather than values asserted directly by the client.

## Decision

The application server will be authoritative for competitive gameplay state.

The client may submit player actions, but the server will determine the resulting authoritative state.

Examples of client-submitted actions may include:

```text
Select Puzzle

Start Attempt

Submit Guess

Request Hint

Complete Action
```

The server will be responsible for determining:

```text
Whether the action is valid

Whether the attempt belongs to the player

Whether the puzzle is currently available

Whether the guess is correct

How many mistakes have occurred

Whether the puzzle is complete

What score should be awarded
```

The client must not submit a final score that the server accepts as authoritative.

## Expected Request Flow

A typical gameplay request may follow this structure:

```text
Browser
    |
    | Submit Player Action
    v
Application Server
    |
    +-- Resolve Session
    |
    +-- Load Attempt
    |
    +-- Validate Ownership
    |
    +-- Validate Puzzle State
    |
    +-- Apply Game Rules
    |
    +-- Update Attempt
    |
    +-- Calculate Result
    |
    v
PostgreSQL
```

The server then returns the portion of the resulting state required by the client.

## Example

For a Connections-style game, the client may submit:

```json
{
  "selectedWords": [
    "Kyoto",
    "Tokyo",
    "Seattle",
    "San Jose"
  ]
}
```

The client should not determine whether the group is correct.

The server should:

1. Resolve the authenticated player session.
2. Load the player's active attempt.
3. Load the authoritative puzzle solution.
4. Verify that the submitted words are valid choices for the current puzzle.
5. Determine whether the selection forms a correct group.
6. Update the attempt state.
7. Update the mistake count if necessary.
8. Determine whether the puzzle is complete.
9. Calculate or update the score as required.
10. Persist the resulting state.
11. Return the appropriate response to the client.

## Rationale

Server-authoritative gameplay provides:

* More reliable leaderboard integrity
* A clear trust boundary
* Centralized game-rule enforcement
* Consistent score calculation
* Better control of persistent attempt state
* Reduced exposure of unpublished puzzle solutions
* Useful experience designing secure client-server interactions

This architecture also prevents game rules from being duplicated independently in the browser and server as authoritative implementations.

## Alternatives Considered

### Fully Client-Side Gameplay

The browser could contain the full puzzle solution, validate guesses locally, calculate the score, and submit the final result.

This would be simple and responsive.

It was not selected because:

* Puzzle answers would be directly available to the browser
* Scores could be modified before submission
* Attempt state would be difficult to trust
* Leaderboard integrity would depend on client behavior
* Validation logic could become inconsistent across clients

Client-side logic may still be used for non-authoritative presentation behavior.

### Client Calculation with Server Verification

The client could calculate the game result and submit both actions and a calculated score for the server to verify.

This was not selected as the primary model because it introduces duplicate implementations of scoring and validation logic.

Where practical, one authoritative server implementation should determine competitive results.

### No Competitive Validation

Because the application serves wedding guests rather than a serious competitive environment, the system could simply trust submitted scores.

This was not selected because basic server validation adds meaningful architectural value without requiring complex anti-cheat systems.

## Client Responsibilities

The client remains responsible for presentation-oriented behavior such as:

* Rendering game state
* Tracking tile selection before submission
* Animations
* Loading indicators
* Temporary UI state
* Input handling
* Accessibility interactions

The client may optimistically update non-critical presentation state where appropriate.

Authoritative state must ultimately come from the server.

## Server Responsibilities

The server is responsible for competitive application state including:

* Player and session validation
* Attempt ownership
* Puzzle availability
* Valid game actions
* Attempt progression
* Mistake counts
* Completion status
* Score calculation
* Persistent results
* Leaderboard eligibility

Game-specific validation should be delegated to game-domain logic rather than implemented directly inside HTTP route handlers.

For example:

```text
Route Handler
      |
      v
Attempt Service
      |
      v
Connections Engine
      |
      v
Persistence Layer
```

## Puzzle Solution Handling

Where practical, unpublished puzzle solutions should remain server-side.

The browser should receive only the information required to render and interact with the puzzle.

Conceptually:

```text
Puzzle
    |
    +-- Public Data
    |      |
    |      +-- Tiles
    |      +-- Prompt
    |      +-- Metadata
    |
    +-- Private Solution
           |
           +-- Correct Groups
           +-- Answers
           +-- Scoring Metadata
```

The exact separation will depend on each game type.

Some games may inherently expose more state to the client than others.

## Score Calculation

Each game type may define different scoring rules.

For example:

```text
Connections
    |
    +-- Completion points
    +-- Mistake penalty
    +-- Hint penalty
```

or:

```text
Trivia
    |
    +-- Correct answer points
    +-- Optional time bonus
```

The score calculation should be performed using authoritative server-side state.

Shared leaderboard code should consume completed game results rather than reimplement individual game rules.

## Request Validation

Server endpoints should validate:

* Request structure
* Session validity
* Attempt ownership
* Puzzle identity
* Submitted game data
* Current attempt state
* Whether the requested transition is allowed

Invalid requests should fail safely without modifying authoritative state.

## Duplicate Requests

The implementation should account for duplicate submissions where they could corrupt game state.

For example, a mobile connection may retry a request after the server has already processed it.

Where necessary, gameplay operations should be designed to be idempotent or detect previously processed actions.

The exact mechanism should be determined during implementation rather than introducing a generalized idempotency system prematurely.

## Performance Considerations

Server validation introduces network requests during gameplay.

The implementation should avoid unnecessary round trips while preserving authoritative state.

For example, temporary tile selection can remain client-side:

```text
Tap Tile
    |
    v
Local UI State
```

while an actual guess submission crosses the server boundary:

```text
Submit Selected Group
    |
    v
Server Validation
```

This balances responsiveness with integrity.

## Security Scope

This decision does not attempt to prevent all forms of cheating.

A sufficiently motivated user may still:

* Automate requests
* Share puzzle answers
* Inspect previously revealed information
* Create multiple anonymous players

These risks are acceptable for the expected wedding use case.

The goal is to prevent trivial manipulation of authoritative scores and state, not to build a professional anti-cheat platform.

## Consequences

### Positive

* Leaderboard scores are based on server-controlled state.
* Game rules have a clear authoritative execution location.
* Puzzle solutions can remain less exposed.
* Client manipulation is less likely to corrupt persistent results.
* Game behavior is more consistent across users.
* The architecture provides useful client-server validation experience.

### Negative

* Gameplay requires additional server requests.
* Server-side game logic becomes more complex.
* Temporary connectivity problems may affect some gameplay actions.
* Integration testing becomes more important.
* Game engines must support server-side execution.
* Development requires careful separation between presentation state and authoritative state.

## Revisit Conditions

This decision should be reconsidered if:

* Offline gameplay becomes a major product requirement
* Latency materially harms the game experience
* A future game requires a fundamentally different synchronization model
* Real-time multiplayer gameplay is introduced
* The application no longer contains competitive or persistent scoring
* The platform expands enough to justify a dedicated game-state service

Any major change to the trust model should be documented in a new ADR that supersedes this decision.
