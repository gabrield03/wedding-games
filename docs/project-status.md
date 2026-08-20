# Project Status

Last updated: 2026-08-19

## Current milestone

**M5 - Backend Foundation & Anonymous Sessions: in progress**

M1, the Connections Prototype milestone, is complete.

M2, Production Game Structure, is complete. It separated production content
from test fixtures, extracted the Connections gameplay controller, added the
Connections puzzle-loading boundary and dynamic route, introduced the game
hub and narrow shared game-page shell, and polished navigation and project
documentation.

M3 Issue 1, building the pure Wordle domain model and duplicate-aware
guess-evaluation algorithm, is complete.

M3 Issue 2, implementing pure Wordle gameplay state and rules, is complete.

M3 Issue 3, building the first playable Wordle board with physical and
on-screen keyboard input, is complete.

M3 Issue 4, completing the full Wordle round flow with feedback, terminal
presentation, answer reveal, and replay behavior, is complete.

M3 Issue 5, polishing Wordle interactions, motion, accessibility, and
small-screen behavior without changing gameplay rules, is complete.

M3 Issue 6, integrating curated local Wordle content, a dynamic puzzle route,
and a Wordle entry point on the game hub, is complete.

The immediate post-M3 corrections for theme-aware Wordle text, request-time
puzzle selection, and Next Word navigation are complete.

M4 Issue 1, reviewing multi-game architecture and duplication before any
abstraction work, is complete.

M4 Issue 2, defining wedding-specific and platform boundaries by
pressure-testing the current application against a hypothetical second
wedding, is complete.

M4 Issue 3, reviewing security and trust boundaries before persistence work,
is complete.

M4 Issue 4 implemented the narrow production and test refactors accepted by
the preceding architecture, event-boundary, and security reviews. M4 is
complete and merged.

M5 Issue 1, designing backend ownership and the anonymous identity/Player
model, is complete and merged.

M5 Issue 2, establishing local Supabase tooling and the Event/Player schema
foundation, is complete and merged.

M5 Issue 3, adding trusted Event resolution and anonymous Player bootstrap, is
complete and merged.

M5 Issue 4, moving Connections production content behind event-scoped
PostgreSQL persistence, is the current issue. Its implementation and requested
local validation are complete; hosted review and merge remain pending.

## Product direction

The wedding-games site should evolve into a small game hub.

Planned navigation direction:

```text
/
  Wedding games home page
  -> Connections
  -> Wordle
  -> future games

/games/connections/[puzzleId]
  Individual Connections puzzle

/games/wordle/[puzzleId]
  Individual Wordle puzzle

/games/wordle
  Request-time Wordle puzzle selection and redirect
```

The root page now serves a simple two-game selection page. Connections links to
`/games/connections/development-puzzle`; Wordle links to `/games/wordle`, which
selects and redirects to one of the local puzzles at request time.

Connections and Wordle remain independent game-specific implementations. Do
not build a generic game platform, registry, repository, or engine until later
requirements demonstrate a concrete shared need.

## M1 completed

M1 delivered a complete playable Connections-style game.

### Domain

- Typed Connections puzzle model
- Runtime puzzle validation
- Pure game-state creation
- Guess validation
- Correct and incorrect guess evaluation
- One-away detection
- Duplicate incorrect-guess detection
- Mistake tracking
- Solved-group tracking
- Remaining-tile derivation
- Win/loss status derivation

### UI

- Select/deselect tiles
- Four-tile selection limit
- Submit enable/disable behavior
- Shuffle
- Solved-group rendering
- Incorrect, one-away, and duplicate feedback
- Win state
- Loss state
- Reveal unsolved answers after loss
- Play Again/reset
- Hydration-safe deterministic initial scrambling
- Random reshuffle on Shuffle and Play Again

### Interaction polish

- Shake animation for incorrect, one-away, and duplicate guesses
- Correct-guess confirmation animation before the solved group resolves
- Reserved feedback area to prevent unnecessary vertical layout shift
- Pressed-state feedback on tiles and controls
- Input lock while a correct guess is resolving

### Accessibility and responsive behavior

- Native button interactions
- Keyboard navigation verified with Tab, Enter, and Space
- Visible focus states
- `aria-pressed` on selectable tiles
- `aria-live` feedback/status regions
- Reduced-motion support
- Responsive four-column layout
- Mobile tile sizing/text wrapping manually verified down to 320px

### Tests

- 31 unit/component tests passing at the end of M1
- 9 Playwright E2E tests passing across Chromium, Firefox, and WebKit
- Full completion/restart E2E flow
- Full loss/restart E2E flow
- Existing smoke E2E coverage

The tests were updated so behavior tests derive IDs/labels from the puzzle fixture rather than depending on old hardcoded content.

## Current code organization

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
    games/
      connections/
        [puzzleId]/
          page.tsx
      wordle/
        page.tsx
        [puzzleId]/
          page.tsx

  components/
    GameCard.tsx
    GamePageShell.tsx

  content/
    connections/
      getConnectionsPuzzle.ts
    wordle/
      puzzles.ts
      getWordlePuzzle.ts

  domain/
    connections/
      gameplay.ts
      types.ts
      validation.ts
    wordle/
      gameplay.ts
      types.ts
      validation.ts

  features/
    connections/
      ConnectionsGameBoard.tsx
      ConnectionTile.tsx
      useConnectionsGame.ts
    wordle/
      WordleGameBoard.tsx
      WordleKeyboard.tsx
      useWordleGame.ts

  types/
    database.generated.ts

supabase/
  config.toml
  data/
    current-wedding-connections.sql
  migrations/
    20260818000000_create_event_player_foundation.sql
    20260819000000_grant_player_bootstrap_access.sql
    20260819010000_create_connections_puzzles.sql
  seed.sql
  tests/database/
    connections_puzzles.test.sql
    event_player_schema.test.sql
    player_rls.test.sql

tests/
  fixtures/
    connections.ts
  unit/
    content/connections/
    content/wordle/
    domain/connections/
    domain/wordle/
    features/connections/
    features/wordle/
  e2e/
    smoke.spec.ts
    connections.spec.ts
    wordle.spec.ts

docs/
  adr/
  architecture.md
  development.md
  requirements.md
  security.md
```

## Current Connections content

The `current-wedding` Event owns the production Connections puzzle in
PostgreSQL. The versioned data SQL preserves the existing
`development-puzzle` public URL and wedding/general sample groups such as:

- Types of cake
- Types of cats
- Things that ring
- Contains bow

This content remains useful for exercising more realistic labels and mobile
wrapping. Unit, component, and E2E expectations use stable independent fixtures
in `tests/fixtures/connections.ts`. Application routes access production
Connections content only through `getConnectionsPuzzle(puzzleId)`, which
resolves the trusted current Event, reads the exact event/public-ID row,
decodes its JSON, and runs domain validation.

## Current Wordle content

`src/content/wordle/puzzles.ts` contains ten local wedding-related five-letter
answers with opaque stable IDs from `wedding-01` through `wedding-10`. The home
page enters through `/games/wordle`, which chooses from this collection at
request time without introducing daily scheduling or persistent history.

The collection is an answer bank only. Structurally valid five-letter guesses
remain playable without dictionary membership or invalid-word rejection.
Application routes access Wordle content through
`getWordlePuzzle(puzzleId)`, which validates found content and keeps missing IDs
distinct from invalid stored puzzles.

## M2 completed

M2 turned the successful prototype into maintainable production structure
without rewriting the working game.

### M2 issue 1 - Separate production content from test fixtures

Completed:

- Moved local application puzzle content to `src/content/connections/`.
- Added a stable Connections fixture under `tests/fixtures/` for unit and
  component tests.
- Removed puzzle content from the Connections domain.
- Preserved the existing root-page behavior without introducing a puzzle-loading
  abstraction.

### M2 issue 2 - Extract Connections gameplay controller

Completed:

- Extracted Connections-specific React orchestration into
  `src/features/connections/useConnectionsGame.ts`.
- Kept pure gameplay rules in `src/domain/connections/gameplay.ts`.
- Reduced `ConnectionsGameBoard.tsx` to presentation, accessibility markup,
  and controller wiring.
- Preserved selection, feedback, animation timing, shuffle, restart, and
  terminal-state behavior.
- Avoided introducing a generic game controller or engine abstraction.

### M2 issue 3 - Add puzzle-loading boundary

Completed:

The UI should not permanently import a hardcoded puzzle directly.

Introduce a stable interface conceptually similar to:

```ts
getConnectionsPuzzle(puzzleId);
```

For M2 this may load local static content.

The purpose is to let a later backend milestone replace the implementation
without requiring the Connections UI to know the storage mechanism.

Implemented:

- Added an asynchronous Connections-specific lookup boundary under
  `src/content/connections/`.
- Kept the local puzzle collection private to the loader implementation.
- Return `null` for unknown puzzle IDs.
- Validate found puzzles with the existing domain validator and throw a clear
  content error when stored data is invalid.
- Updated the root route to load its puzzle through the boundary without
  changing visible behavior.

### M2 issue 4 - Add real game routes and home page

Completed:

Move toward:

```text
/
  game-selection home

/games/connections/[puzzleId]
  Connections puzzle route
```

The home page should eventually show available game cards/buttons.

This issue should focus on simple usable navigation, not final wedding visual design.

Implemented:

- Replaced the root Connections prototype route with a simple Wedding Games
  home page and one explicit Connections entry point.
- Added `/games/connections/[puzzleId]` using the existing asynchronous puzzle
  loader.
- Translate unknown puzzle IDs into Next.js `notFound()` behavior.
- Kept routing concerns outside the Connections board, controller, and domain.
- Updated application metadata and end-to-end route/navigation coverage.
- Avoided introducing a generic game registry, shared shell, or final visual
  design.

### M2 issue 5 - Polish game navigation and align shared page structure

Completed:

Implemented:

- Simplified the home-page card so its only interactive element is the exact
  `Play Connections` link; the game name remains normal content and the card is
  compact on wider screens.
- Added a narrow `GamePageShell` that owns only the page-level container, small
  navigation area, explicit link to `/`, and child rendering.
- Added visible `Back to games` navigation that works independently of browser
  history and has a visible keyboard focus state.
- Removed only the outer page-level container from `ConnectionsGameBoard`; its
  game content, accessibility markup, controls, feedback, and behavior remain
  unchanged.
- Extended the home-page end-to-end flow to cover navigation into the puzzle
  and back to the game hub.
- Aligned the README, architecture snapshot, development setup wording, and
  project status with the structure implemented during M2.

Issue 5 and M2 passed validation and were merged.

## M3 issue 1 - Build Wordle domain model and guess evaluation

Completed:

Issue 1 is intentionally limited to pure TypeScript Wordle domain code:

- minimal Wordle puzzle and letter-evaluation types
- fixed five-letter Wordle word length
- runtime validation for puzzle data and evaluator input invariants
- duplicate-aware guess evaluation
- focused domain tests, especially for repeated-letter allocation

React UI, routing, input handling, allowed-word dictionaries, attempt state,
persistence, and shared multi-game abstractions remain outside this issue.

Implemented:

- Added a minimal Wordle puzzle model and per-letter evaluation types under an
  independent `src/domain/wordle/` module.
- Established `WORDLE_WORD_LENGTH = 5` as the single fixed word-length
  constant.
- Added runtime puzzle validation for blank IDs, answer length, and strict
  ASCII alphabetic answer content.
- Added pure, case-insensitive guess evaluation with uppercase output and clear
  errors for malformed direct inputs.
- Used two-pass answer-letter accounting so exact matches are reserved first
  and each remaining answer-letter occurrence can satisfy at most one
  misplaced guessed letter.
- Added focused validation and gameplay tests, including repeated-letter and
  excess-duplicate cases.
- Kept Wordle independent from Connections, React, Next.js, content loading,
  and generic game abstractions.

Issue 1 passed validation and was merged.

## M3 issue 2 - Implement Wordle gameplay state and rules

Completed:

Issue 2 will build pure state transitions on top of `evaluateWordleGuess` for:

- six attempts
- current unsubmitted guess input
- letter addition, input limits, and backspace
- submitted guess and evaluation history
- derived playing, won, and lost status
- terminal-state action prevention
- clean initial/reset state

Dictionary membership, allowed-word lists, keyboard UI, React, routing,
content loading, persistence, and shared game abstractions remain outside this
issue.

Implemented:

- Added immutable Wordle state for the current guess and submitted guess
  history.
- Added `WORDLE_MAX_ATTEMPTS = 6` as a Wordle gameplay-domain rule.
- Added letter entry with uppercase normalization, a five-letter cap, clear
  rejection of malformed direct input, and backspace behavior.
- Added explicit `submitted`, `incomplete`, and `game_over` submission results.
- Store each normalized submitted guess with its existing evaluator-produced
  letter evaluation, then clear the current guess.
- Derive playing, won, and lost status solely from submitted evaluations and
  attempt count, checking for a win before the sixth-attempt loss boundary.
- Prevent editing and submission after terminal states through immutable
  no-op transitions.
- Added focused tests for input boundaries, submission history, five and six
  misses, wins before and on attempt six, terminal states, reset behavior, and
  immutability.
- Kept dictionary, UI, content, persistence, Connections, and shared-engine
  concerns outside the implementation.

Issue 2 passed validation and was merged.

## M3 issue 3 - Build playable Wordle board and keyboard input

Completed:

Issue 3 will add the first Wordle-specific React controller and view on top of
the existing domain API:

- six five-letter board rows derived from submitted guesses, current input,
  and remaining attempts
- physical keyboard input with correct listener cleanup
- an accessible on-screen keyboard using the same controller actions
- submitted correct, present, and absent tile states
- derived keyboard-letter status with correct-over-present-over-absent
  precedence
- a minimal development-only route and puzzle value for manual testing
- focused component coverage for both input paths and evaluated output

Final animations, refined responsive styling, word-bank/content loading,
game-hub integration, and fuller terminal-state presentation remain outside
this issue.

Implemented:

- Added a Wordle-specific React controller that owns UI state, delegates all
  transitions to the existing domain API, and exposes shared letter,
  backspace, and submission actions.
- Added a cleaned-up global physical-keyboard listener that ignores Ctrl, Alt,
  and Meta shortcuts along with interactive and editable event targets.
- Added an always-six-row, five-tile board derived from stored submissions,
  current input, and remaining rows without reevaluating historical guesses.
- Added an accessible on-screen keyboard using native buttons and the same
  controller actions as physical input.
- Derive keyboard status from submitted evaluations with
  correct-over-present-over-absent precedence and no stored duplicate state.
- Communicate submitted letter results through accessible row descriptions in
  addition to visual color states.
- Added a static `/games/wordle/development` route with one route-local typed
  puzzle for manual testing, without adding a loader, registry, dynamic route,
  or game-hub entry.
- Added focused component tests for board shape, on-screen input, physical
  input, submission display, keyboard statuses, shortcuts, and focused or
  editable input handling.
- Fixed current-row letter contrast and refined the Enter and accessible
  Backspace controls after manual testing.
- Kept Connections, Wordle domain rules, content architecture, and generic
  game or keyboard abstractions unchanged.

Issue 3 passed validation, manual testing, and was merged.

## M3 issue 4 - Complete Wordle gameplay flow

Completed:

Issue 4 will complete a full Wordle round using the existing domain API:

- visible incomplete-submission feedback without consuming an attempt
- clear win and loss presentation
- answer reveal after loss
- board and keyboard retained but disabled after completion
- Play Again using the same puzzle
- complete reset of guesses, current input, derived keyboard statuses,
  feedback, and terminal presentation
- accessible live-region announcements for feedback and outcomes

Allowed-word validation, curated content, animations, dynamic routing,
game-hub integration, persistence, and shared game abstractions remain outside
this issue.

Implemented:

- Added transient incomplete-submission feedback to the Wordle controller
  alongside the existing domain game state.
- Interpret the domain submission result directly: submitted guesses update
  state, incomplete guesses show `Not enough letters`, and terminal submission
  remains a no-op.
- Clear incomplete feedback immediately on letter entry, backspace, successful
  submission, and restart.
- Derive win and loss presentation entirely from the existing domain
  `gameStatus`, with no duplicate terminal UI state.
- Keep the completed board and disabled keyboard visible while showing a
  concise success state or game-over state with the actual puzzle answer.
- Added a native `Play Again` control that creates a fresh domain state and
  clears controller feedback while retaining the same puzzle.
- Allow submitted guesses, current input, keyboard statuses, terminal state,
  and answer reveal to reset naturally from the fresh state.
- Added one visible atomic polite status region for incomplete, win, loss, and
  answer-reveal announcements.
- Added focused component coverage for incomplete feedback lifecycle, attempt
  preservation, win, sixth-attempt loss, answer reveal, terminal input lock,
  and restart after both outcomes.
- Kept the Wordle domain, development route, Connections, and shared
  infrastructure unchanged.
- Refined the on-screen keyboard after manual testing so correct and present
  letters retain the neutral key appearance while absent letters alone are
  visually ruled out in gray; accessible status names and status precedence
  remain unchanged.

Issue 4 passed validation, manual testing, and was merged.

The same-puzzle Play Again behavior delivered by this issue was later replaced
by the completed post-M3 request-time Next Word flow.

## M3 issue 5 - Polish Wordle interactions and accessibility

Completed:

Issue 5 will add focused interaction polish to the completed Wordle flow:

- retriggerable active-row feedback for incomplete submissions
- short submitted-tile reveal feedback
- reduced-motion alternatives for all nonessential motion
- focused accessibility and approximately 320px responsive review

Gameplay rules, board evaluation colors, the simplified keyboard color
mapping, content, routing, persistence, and broad wedding visual design remain
outside this issue.

Implemented:

- Added a controller-owned incomplete-submission attempt counter that advances
  on every incomplete result and resets with the rest of the game.
- Use that counter only to remount the active row so repeated incomplete
  submissions can retrigger a short shake without remounting the board or
  submitted rows.
- Added a short reveal animation to only the newest submitted row, using its
  stored evaluation and 50ms tile staggering without timers, delayed state, or
  an input lock.
- Added Wordle-specific motion styles and disabled both new animations for
  `prefers-reduced-motion` while preserving evaluation colors and text/status
  feedback.
- Added focused component coverage for incomplete shake presentation and
  retriggering, clearing motion on edit, newest-row-only reveal treatment, and
  stagger delays.
- Preserved the existing responsive board and keyboard layout after inspection;
  no speculative small-screen styling changes were required.

Issue 5 passed validation, manual testing, and was merged.

## M3 issue 6 - Integrate Wordle content, routes, and game hub

Completed:

Issue 6 will productionize the completed Wordle prototype without changing its
gameplay mechanics:

- add a small curated local bank of wedding-related five-letter answers
- load Wordle puzzles through a Wordle-specific validated content boundary
- replace the temporary development route with `/games/wordle/[puzzleId]`
- add Wordle as the second playable game on the home page
- add focused loader, routing, navigation, and real-browser gameplay coverage

Allowed-guess dictionaries, random or daily selection, backend persistence,
sessions, scoring, statistics, leaderboards, and final wedding visual design
remain outside this issue.

Implemented:

- Added ten uppercase wedding-related answer puzzles with opaque stable IDs.
- Added an asynchronous Wordle-specific loader that returns `null` for unknown
  IDs, runtime-validates found content, and throws a descriptive content error
  when a stored puzzle is invalid.
- Replaced the temporary development route with
  `/games/wordle/[puzzleId]`, using the existing generated `PageProps` shape,
  loader boundary, `notFound()`, `GamePageShell`, and unchanged Wordle board.
- Added an explicit Wordle entry to the home page and arranged the two explicit
  game cards in a responsive one-column/two-column grid without a card or game
  registry abstraction.
- Extended smoke coverage for both home-page entries, Wordle navigation and
  return navigation, and an unknown Wordle ID.
- Added Wordle real-browser specifications for puzzle win and loss, answer
  reveal, terminal board/keyboard retention, and restart, deriving the
  real answer through the public loader.
- Updated project documentation for the second playable game and its parallel
  content, route, controller, view, test, and domain boundaries.
- Kept Wordle client-evaluated through M3; server-authoritative attempts and
  stronger answer protection remain deferred with backend and competitive
  work.
- Preserved both games' existing gameplay code and avoided generic content or
  game abstractions.

Issue 6 passed validation and manual testing and was merged, completing M3.

## Post-M3 Wordle corrections completed

Status: Complete and locally validated.

Implemented:

- Replaced the hardcoded white current-tile foreground with the existing
  light/dark theme token and added a dark-mode instruction-text variant.
- Added `/games/wordle` as a request-time selector using `connection()` before
  random selection and redirecting to the existing dynamic puzzle route.
- Replaced the direct home-page puzzle link with the selection entry route.
- Replaced terminal Play Again reset behavior with a route-provided Next Word
  link that excludes the puzzle just completed.
- Keep the completed board and keyboard visible until navigation, then key the
  next board by puzzle ID to guarantee fresh client gameplay state.
- Kept random selection in the Wordle content layer and kept the gameplay
  controller and domain unaware of the puzzle collection and routing.

## M4 issue 1 - Review multi-game architecture and duplication

Status: Architecture review complete; documentation alignment is the only
change in this issue.

Accepted conclusions:

- Retain independent Connections and Wordle vertical slices.
- Keep domain types, validation, and gameplay rules pure and game-specific.
- Keep React controllers, boards, and interaction behavior game-specific.
- Keep content implementations and dynamic routes explicit per game.
- Retain `GamePageShell` as a genuinely shared, intentionally narrow
  application abstraction.
- Treat a narrow presentational `GameCard` as a justified candidate for later
  M4 refactoring while keeping game entries explicit.
- Treat matching asynchronous loader contracts as a convention rather than a
  generic repository or loader implementation.
- Wait for more evidence before introducing a game registry or catalog.
- Do not introduce generic game, domain, gameplay-state, controller, or route
  interfaces.
- Do not introduce shared gameplay-flow E2E infrastructure yet.

Candidates recorded for M4 Issue 4, after the wedding/platform and security
reviews:

- Extract a narrow presentational `GameCard` without adding a registry.
- Align Connections E2E production-content access through
  `getConnectionsPuzzle`.
- Consider a Connections-specific selection-size constant if it meaningfully
  prevents domain/controller drift.

A shared shake-animation CSS refactor is not planned. Reconsider it only if
future work naturally changes the animations in both games.

## M4 issue 2 - Define wedding-specific and platform boundaries

Status: Boundary review complete; documentation alignment is the only change
in this issue.

Accepted conclusions:

- Treat platform/application behavior, game-specific behavior, and
  event/wedding-specific data as distinct conceptual boundaries.
- Keep the current application as one intentional implicit event; this issue
  does not choose between one event per deployment/database and a shared
  multi-event system.
- Keep Connections and Wordle mechanics reusable and free of couple identity.
- Treat puzzle instances as game-owned content that is conceptually associated
  with an event without introducing a generic content schema.
- Treat Connections puzzle data, Wordle answers, enabled games, and
  event-facing presentation or metadata as the current event-related data.
- Retain harmless hardcoding for the Wedding Games product name, game and
  navigation labels, explicit routes, the neutral theme, and local
  repository-backed content.
- Treat current puzzle IDs as local prototype lookup keys rather than final
  durable database identity with assumed scope semantics.
- Keep reaction triggers game-specific and future couple photos event-owned;
  wait for implementation evidence before sharing reaction presentation.
- Continue to allow a separate deployment as a reasonable isolation model for
  the current wedding.

Before M5 persistence, the project must understand explicit ownership for:

- Puzzles and game availability
- Players and sessions
- Attempts and scores
- Leaderboards
- Personalized assets and event administration

The M4 Issue 3 security/trust review established that the server must resolve
trusted event context and that persisted event-owned data must have explicit
event scope. Session identity remains separate from event and administrative
authorization. The exact session/event relationship remains open for M5
design.

No database schema, multi-event route, giant event configuration object, or
reaction framework is designed or implemented by Issue 2.

## M4 issue 3 - Define security and trust boundaries

Status: Security review complete; `docs/security.md` records the accepted
trust model and pre-M5 decisions.

Accepted conclusions:

- Continue operating the current product as one wedding/event without
  implementing multi-tenancy now.
- Make `Event` an explicit persistent ownership concept before M5 so the first
  backend does not silently treat data as globally owned.
- Require the server to establish trusted event context; client-provided IDs,
  slugs, route parameters, cookies, and request data do not establish
  authorization by themselves.
- Apply explicit event scope to protected reads and writes for future puzzles,
  sessions, players, attempts, scores, leaderboards, reaction assets, and
  administrative permissions.
- Keep anonymous session identity separate from event and administrative
  authorization, while deferring the exact session/event relationship to M5
  design.
- Have clients submit gameplay actions rather than authoritative outcomes once
  persistence, scoring, or competition requires trusted results.
- Treat opaque identifiers as lookup/discovery controls rather than
  authorization.
- Keep private solutions, assets, privileged data, and secrets out of public
  responses, and treat anything delivered to browser JavaScript as public.
- Validate and resource-bound all external input.

The accepted model also records future constraints for personalized reaction
assets, server-only secrets, identifier scope, public versus private puzzle
representations, and application authorization backed by database defense in
depth. It does not choose a database schema, final multi-event deployment
model, authentication system, upload implementation, rate limits, or final RLS
policies.

## M4 issue 4 - Apply justified multi-game architecture refactors

Status: Complete and merged.

Implemented:

- Added a narrow shared `GameCard` that owns only home-card presentation while
  `page.tsx` continues to declare the Connections and Wordle entries, labels,
  destinations, and Wordle prefetch behavior explicitly.
- Added the Connections-domain `CONNECTIONS_GROUP_SIZE` invariant and used it
  for group validation, guess evaluation, one-away evaluation, selection caps,
  and submit eligibility. The separate required group-count rule and static
  four-column presentation remain independent.
- Updated Connections browser tests to obtain application puzzle content
  through `getConnectionsPuzzle` rather than importing the concrete local
  content module directly.
- Preserved independent Connections and Wordle content, domains, controllers,
  boards, loaders, and routes.

No game registry, generic repository, generic loader, shared route, generic
controller/domain interface, shared gameplay E2E framework, event runtime,
multi-tenancy, authentication, persistence, or security infrastructure was
introduced. The event-ownership, trusted-context, session, and authoritative
gameplay findings remain requirements for M5 design rather than M4
implementation.

## M5 issue 1 - Design backend ownership and anonymous session model

Status: Complete and merged.

Accepted decisions:

- Introduce `Event` as the first-class owner of persisted wedding-specific
  data while continuing to operate one current wedding.
- Resolve the current Event from trusted server-owned configuration such as
  `CURRENT_EVENT_SLUG`; client-provided event values do not authorize.
- Use Supabase Auth anonymous sign-in instead of a custom application-owned
  session-token system.
- Keep Supabase Auth identity separate from an event-scoped application
  Player, and do not create a duplicate custom Session table.
- Bootstrap the anonymous identity and Player silently without requiring a
  display name.
- Keep identity separate from attempts, completion, scoring, and leaderboard
  eligibility. Identity does not limit replay or consume puzzle access.
- Scope public puzzle IDs by Event and game while keeping internal database
  UUIDs conceptually separate.
- Persist Event, Player, Connections content, and Wordle content during M5.
- Keep Connections and Wordle persistence game-specific; a Connections JSONB
  representation and typed Wordle columns are acceptable different designs.
- Preserve current client gameplay and its transitional full-solution exposure
  during M5. M6 owns authoritative gameplay and answer protection.
- Default to authenticated request-scoped Supabase access and RLS. Introduce a
  privileged server-only client only if a concrete operation proves normal
  scoped access insufficient.
- Limit Next.js Proxy to Supabase Auth cookie/token refresh and propagation;
  server-side application/data-access code remains responsible for trusted
  Event resolution and authorization.
- Evaluate anonymous-user abuse, cleanup, CAPTCHA, and rate-limit protection
  before broad public guest launch without implementing them in Issue 1.

These decisions are recorded in ADR-0005 and ADR-0006. ADR-0005 refines and
supersedes ADR-0003's implementation details while ADR-0003 remains unchanged
as historical context.

### Final M5 issue plan

#### Issue 1 - Design backend ownership and anonymous session model

- Record the approved Event, Auth identity, Player, and persistence direction.
- Add ADR-0005 and ADR-0006.
- Make documentation changes only; add no backend implementation.

#### Issue 2 - Establish Supabase tooling and event-owned schema foundation

Status: Complete and merged.

- Add local Supabase development tooling.
- Add reproducible migrations, deterministic seed data, generated database
  types, and local database tests/documentation.
- Create the minimum Event and Player persistence foundation with initial
  constraints/RLS.
- Do not add the application Auth flow yet.

Implemented on the current branch:

- Pinned Supabase CLI `2.115.0` as a project-local development dependency.
- Initialized version-controlled local Supabase configuration with migrations
  as the only schema source of truth.
- Added `events` and event-scoped `players` with internal UUIDs, timestamps,
  validated unique Event slugs, foreign keys, and
  `unique(event_id, auth_user_id)`.
- Restricted Event deletion while Players exist and cascade Player cleanup
  when the corresponding Supabase Auth user is deleted.
- Enabled RLS immediately. Events have no client access; authenticated users
  can select only their own Player rows and cannot directly mutate Players.
- Seeded deterministic `current-wedding` and test-only `isolation-test` Events
  without seeding Auth users, Players, game content, or personal data.
- Added focused pgTAP schema/constraint and RLS tests.
- Generated and committed the TypeScript database contract from the local
  schema.
- Added local start, reset, database-test, and type-generation npm scripts and
  documented the Docker-backed reproducibility workflow.
- Kept application Auth, trusted Event resolution, Player bootstrap, hosted
  Supabase, privileged application access, and puzzle persistence deferred.

#### Issue 3 - Add trusted event resolution and anonymous player bootstrap

Status: Complete and merged.

- Integrate Supabase anonymous Auth with Next.js.
- Resolve the current Event only from trusted server configuration.
- Silently create or reuse the event-scoped Player without a display-name form.
- Reuse identity/Player for the same browser without adding replay limits.
- Use Proxy only for Auth cookie/token refresh, not authorization.
- Add no custom Session table; isolate privileged access to the two operations
  that the restrictive client RLS posture cannot perform.

Implemented locally on the current branch:

- Added Supabase browser/server SSR clients plus a separate plain
  `@supabase/supabase-js` secret-key client isolated behind `server-only`.
- Enabled local anonymous Auth and added placeholder-only environment setup.
- Scoped Next.js Proxy to game routes and the Player-bootstrap endpoint for
  cookie/token refresh only.
- Added a games-level single-flight browser bootstrap that reuses or creates
  an anonymous Auth session and remains retryable after failure.
- Added `POST /api/player/bootstrap`, which derives identity only from verified
  claims, resolves the Event only from `CURRENT_EVENT_SLUG`, and returns no
  internal IDs.
- Added conflict-ignore Player insertion followed by exact-pair selection,
  backed by `unique(event_id, auth_user_id)`.
- Added explicit `service_role` Event `SELECT` and Player `SELECT`/`INSERT`
  grants without Player `UPDATE` or `DELETE`.
- Kept the elevated RLS-bypassing secret credential as a narrow server-only
  exception rather than a default persistence pattern.
- Preserved existing gameplay when the transitional bootstrap is unavailable.

Local validation completed:

- Clean database reset replayed both migrations and deterministic seed data.
- Database lint reported no schema warnings.
- Both pgTAP files passed with 39 assertions.
- A real local anonymous Auth session survived client recreation, two
  bootstrap requests returned `204`, one matching Player existed, and direct
  authenticated Event access remained denied.
- Format, format check, lint, typecheck, and all 111 unit/component tests
  passed.

#### Issue 4 - Move Connections content behind PostgreSQL

Status: Implemented and validated locally; hosted review and merge pending.

- Replace repository-backed production Connections content with event-scoped,
  Connections-specific persistence.
- Preserve URLs, gameplay, loader semantics, and domain validation.
- Add no generic repository.

Implemented on the current branch:

- Added event-owned `connections_puzzles` storage with internal UUID identity,
  event-scoped public IDs, typed columns, JSONB groups, constraints, RLS, and
  Event-delete cascade behavior.
- Granted the isolated server-only role Connections `SELECT` only; browser
  roles have no table access and content mutation remains outside runtime
  application code.
- Added ordered, idempotent `current-wedding` content SQL that requires its
  Event and preserves the existing `development-puzzle` route/content.
- Moved `getConnectionsPuzzle` to trusted Event resolution and exact
  `(event_id, public_id)` database lookup while preserving its async/null API,
  structural decoding, and domain validation.
- Removed the repository-backed production puzzle module without adding a
  fallback or generic repository.
- Kept E2E expected content in an independent fixture rather than importing
  the server-only production loader.
- Added focused loader tests and pgTAP coverage for schema, ownership,
  isolation, constraints, grants, seed data, and cascade behavior.
- Updated CI to start/reset local Supabase and map actual CLI environment names
  before the existing application/E2E/build validation.

Local validation completed:

- Clean reset replayed all three migrations, the deterministic Event seed, and
  the ordered current-wedding Connections content file.
- Database lint reported no schema errors; all three pgTAP files passed with
  72 assertions, including after an explicit second content-file application.
- Generated database types were refreshed from the local schema.
- All 116 unit/component tests passed, including seven focused loader tests.
- Format, format check, lint, typecheck, and diff checks passed.
- Seven targeted Chromium E2E tests passed against real local PostgreSQL
  content, covering Connections completion/restart, loss/restart, navigation,
  and missing-puzzle behavior plus the existing smoke flows.

#### Issue 5 - Move Wordle content and selection behind PostgreSQL

- Replace repository-backed Wordle content and selection with event-scoped,
  Wordle-specific persistence.
- Migrate only the existing ten answers.
- Preserve URLs, gameplay, availability filtering, and exclusion behavior.
- Add no generic repository or daily/history system.

#### Issue 6 - Harden M5 database testing and deployment workflow

- Validate clean reset/seed, database lint/tests, and event isolation.
- Cover anonymous identity/Player creation and reuse in E2E.
- Preserve existing Connections and Wordle behavior.
- Document server-only secrets correctly and evaluate anonymous signup abuse
  controls before broad public launch.
- Do not claim server-authoritative gameplay.

## M5 issue 1 non-goals and deferred work

Issue 1 does not implement:

- Supabase persistence
- Supabase dependencies, schema, migrations, Auth, cookies, or Proxy
- Event resolution or Player creation
- Puzzle persistence
- Attempts or completion history
- server-authoritative guess submission
- leaderboard
- scoring
- statistics
- one-play restrictions
- anti-cheat
- daily puzzle scheduling
- guest-facing display-name/profile onboarding
- cocktail-hour team/social mode
- personalized Wordle answers not supplied by the couple
- allowed-guess dictionaries and invalid-word rejection
- daily Wordle scheduling and no-repeat puzzle history
- generic multi-game engine

Still unresolved for later implementation/design:

- Exact local/hosted Supabase CI workflow details
- Future leaderboard scoring and replay-eligibility rules
- Cross-device recovery and account linking
- Anonymous-user cleanup, CAPTCHA, and rate-limit approach
- Final shared multi-event deployment model

## Existing ADR decisions

The current ADR set includes:

- ADR 0001: Next.js full-stack application
- ADR 0002: PostgreSQL via Supabase
- ADR 0003: anonymous player sessions
- ADR 0004: server-authoritative gameplay
- ADR 0005: Supabase anonymous Auth with event-scoped Players
- ADR 0006: Event as the persistent ownership boundary

Do not create a new ADR for small refactors. Add one only when an issue makes a
durable architectural decision that warrants preserving the reasoning.

## Local environment notes

Primary local repository path:

```text
E:\Personal\GitHub\wedding\wedding-games
```

Known environment:

- Windows PowerShell
- Node 24
- npm 11
- VS Code
- Docker Desktop 4.87.0 using Linux containers through WSL 2
- Supabase CLI 2.115.0 installed as a project development dependency
- repository located on `E:` drive

Next.js sometimes reports a slow-filesystem warning for the `E:` drive. It has not been a functional blocker.

## Full validation gate

Before merging an implementation issue:

```powershell
npm run format; npm run format:check; npm run lint; npm run typecheck; npm test; npm run test:e2e; npm run build;
```

CI and Vercel preview should also be green before merge.

## Immediate next step

Finish M5 Issue 4 validation and review, apply the migration and explicit
current-wedding Connections data file to the linked hosted project in the
separate deployment step, then verify the preview before merge. M5 Issue 5
will move Wordle content and selection behind its own PostgreSQL boundary.
