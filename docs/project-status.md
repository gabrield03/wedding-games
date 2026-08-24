# Project Status

Last updated: 2026-08-23

## Current milestone

**M7 - Strands Prototype: final integration complete; awaiting PR merge**

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
PostgreSQL persistence, is complete and merged.

M5 Issue 5, moving Wordle production content and request-time selection behind
event-scoped PostgreSQL persistence, is complete and merged.

M5 Issue 6, hardening database testing and deployment workflow, is complete.
M5 is complete.

M5.5 Issue 1 added local personalized reaction photos to Connections without
changing gameplay rules, persistence, authentication, or Wordle. Issue 1 is
complete.

M5.5 Issue 2 expands the real photo pools, lengthens intermediate reaction
presentation, and replaces immediate-repeat avoidance with current-game
uniqueness plus best-effort immediately-previous-game avoidance. Issue 2 and
the M5.5 mini-milestone are complete.

M6 Issue 1 establishes the trusted server-side request boundary that resolves
the authenticated, event-scoped Player for future authoritative gameplay.
Issue 1 is complete. No game attempt persistence or authoritative gameplay
endpoint was part of this issue.

M6 Issue 2 implements the backend-only authoritative Connections Attempt
boundary. Issue 2 is complete and merged.

M6 Issue 3 cuts the Connections client over to authoritative Attempts and
removes the unrevealed solution from the browser boundary. The cutover and its
post-deployment database round-trip optimization are complete.

M6 Issue 4 added the server-authoritative Wordle backend, persistent Wordle
Attempts, and server-only accepted-guess validation. Issue 4 is complete and
merged.

M6 Issue 5 cuts the Wordle client over to authoritative Attempts and removes
the hidden answer from browser-facing route props and render payloads.
Issue 5 is complete and merged. M6 server-authoritative gameplay is complete.

M7 is functionally complete and awaiting the final integration PR merge. It
includes the pure Strands domain and validator, a playable accessible board,
five personalized puzzles with deterministic navigation, hint behavior,
home-page integration, a `/games/strands` resume entry point, and
Strands-specific browser-local persistence for discovered progress and the
last visited puzzle. Server-authoritative Strands Attempts and answer
protection remain intentionally deferred to the next milestone.

Final reaction behavior:

- Correct non-winning groups briefly show a randomly selected celebratory
  solo reaction.
- Wrong and one-away guesses preserve their distinct gameplay feedback while
  sharing the playful edge-peek incorrect-reaction pool and its usage history.
- Wins show a prominent persistent couple reaction, and losses show a
  distinct persistent loss reaction, until Play Again.
- Duplicate guesses show no photo reaction.
- Within one game, each pool strictly excludes every photo already shown from
  that pool. Wrong and one-away outcomes share one incorrect-pool history.
- After Play Again, selection first avoids photos used in both the current and
  immediately previous game, then relaxes only previous-game avoidance when
  necessary. A truly exhausted current-game pool produces no photo rather than
  repeating one.
- Narrow per-image focal-position overrides preserve important subjects where
  the default crop is insufficient, including top alignment for `correct-3.jpg`
  and `correct-6.PNG` plus right alignment/inset handling for
  `incorrect-2.JPEG`.
- Intermediate reactions have a longer visible lifetime: they enter quickly,
  remain settled for roughly one second, and then dissolve while floating
  upward over approximately 1.8 seconds. Normal tile editing no longer clears
  them prematurely.
- Reduced-motion mode retains the same reaction lifetime with opacity-only
  presentation and no transform motion.

M5.5 Issue 1 final validation completed successfully:

- Format, format check, lint, typecheck, and `git diff --check` passed.
- All 146 unit/component tests passed, including 28 focused reaction and
  Connections component tests.
- The full Playwright suite passed with 30 of 30 tests across Chromium,
  Firefox, and WebKit.
- The production build passed.

M5.5 Issue 2 final validation completed successfully:

- All 33 focused reaction and Connections component tests passed.
- All 151 unit/component tests passed.
- Format, format check, lint, typecheck, and `git diff --check` passed.
- Manual visual verification passed for reaction timing, photo framing, and
  back-to-back-game rotation.
- The full Playwright suite and production build passed.

M5 delivered the backend foundation for the current single-Event application:

- Persistent Event ownership and trusted server-side current-Event resolution
- Supabase anonymous Auth with silent, idempotent event-scoped Player bootstrap
- Event-owned PostgreSQL content for Connections
- Event-owned PostgreSQL content and server-side puzzle selection for Wordle
- Deterministic local Supabase reconstruction from migrations, local/test seed,
  and ordered production-content SQL
- Database lint and pgTAP validation for constraints, grants, ownership,
  isolation, and seeded content
- Automated generated database type-drift protection
- Database-backed Playwright validation in CI using ephemeral local Supabase
- A documented manual hosted migration and production-content deployment
  workflow without hosted credentials in CI

## Product direction

The wedding-games site should evolve into a small game hub.

Planned navigation direction:

```text
/
  Wedding games home page
  -> Connections
  -> Wordle
  -> Strands

/games/connections/[puzzleId]
  Individual Connections puzzle

/games/wordle/[puzzleId]
  Individual Wordle puzzle

/games/wordle
  Request-time Wordle puzzle selection and redirect

/games/strands
  Resume the most recently visited valid Strands puzzle, or enter wedding-01
  for a first-time browser

/games/strands/[puzzleId]
  Individual Strands puzzle
```

The root page now serves a three-game selection page. Connections links to
`/games/connections/development-puzzle`; Wordle links to `/games/wordle`, which
selects and redirects to one of the current Event's PostgreSQL-backed puzzles
at request time; and Strands links to `/games/strands`, which resumes the
browser's most recently visited valid Strands puzzle or falls back to
`wedding-01`.

Connections, Wordle, and Strands remain independent game-specific
implementations. Do not build a generic game platform, registry, repository,
persistence framework, or engine until later requirements demonstrate a
concrete shared need.

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

## Historical code organization snapshot

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
      getWordlePuzzle.ts
      selectRandomWordlePuzzleId.ts

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
      ConnectionsReaction.tsx
      ConnectionTile.tsx
      connectionsReactions.ts
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
    current-wedding-wordle.sql
  migrations/
    20260818000000_create_event_player_foundation.sql
    20260819000000_grant_player_bootstrap_access.sql
    20260819010000_create_connections_puzzles.sql
    20260819020000_create_wordle_puzzles.sql
  seed.sql
  tests/database/
    connections_puzzles.test.sql
    event_player_schema.test.sql
    player_rls.test.sql
    wordle_puzzles.test.sql

tests/
  fixtures/
    connections.ts
    wordle.ts
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

public/images/connections/reactions/
  correct/
  incorrect/
  loss/
  win/
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
Connections routes load only public ID and title through
`getConnectionsPuzzlePreview(puzzleId)`. The authoritative server service uses
the explicit event-scoped full loaders to decode and validate the complete
puzzle without serializing it to the browser.

## Current Wordle content

The `current-wedding` Event owns ten typed Wordle rows in PostgreSQL with the
stable public IDs `wedding-01` through `wedding-10`. The home page enters
through `/games/wordle`, which fetches only that Event's public IDs and chooses
one at request time without daily scheduling or persistent history.

The PostgreSQL collection remains an answer bank only. The M6 Wordle backend
uses a broader committed server-only English dictionary for accepted guesses
without turning that dictionary into answer content or adding a database
lookup.
Application routes access Wordle content through `getWordlePuzzle(puzzleId)`,
which resolves the trusted current Event, maps typed database content, applies
domain validation, and keeps missing IDs distinct from backend or invalid
content failures. E2E expectations use the independent fixture in
`tests/fixtures/wordle.ts`.

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

Status: Complete and merged.

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

Status: Complete and merged.

- Replace repository-backed Wordle content and selection with event-scoped,
  Wordle-specific persistence.
- Migrate only the existing ten answers.
- Preserve URLs, gameplay, availability filtering, and exclusion behavior.
- Add no generic repository or daily/history system.

Implemented on the current branch:

- Added the typed, event-owned `wordle_puzzles` table with internal UUIDs,
  event-scoped public IDs, canonical uppercase five-letter answers,
  constraints, RLS, and Event-delete cascade behavior.
- Granted the isolated server-only role Wordle `SELECT` only; browser roles
  have no direct access and runtime content mutation remains disallowed.
- Added ordered, idempotent current-wedding Wordle data SQL preserving all ten
  existing IDs and answers without adding isolation-test content.
- Moved direct lookup to trusted Event resolution and exact
  `(event_id, public_id)` filtering while preserving the async/null API and
  domain validation.
- Added a Wordle-specific async selector that fetches only current-Event public
  IDs, excludes the previous puzzle when alternatives exist, reuses the only
  puzzle when necessary, and stores no played history.
- Removed the repository-backed production Wordle array and moved E2E expected
  content to an independent fixture.
- Kept `connection()` as the explicit request-time execution boundary and
  preserved all Wordle gameplay, routes, Next Word behavior, and client answer
  exposure.
- Added focused loader, selector, schema, ownership, isolation, grant, and seed
  tests. Existing Issue 4 CI requires no change.

Local validation completed:

- Clean reset replayed all four migrations, the deterministic Event seed, and
  both ordered game-content data files.
- Database lint reported no schema errors; all four pgTAP files passed with
  104 assertions, including after an explicit second Wordle content-file
  application.
- Generated database types were refreshed from the local schema.
- All 127 unit/component tests passed, including 15 focused Wordle
  loader/selector tests.
- Format, format check, lint, typecheck, and diff checks passed.
- Seven targeted Chromium E2E tests passed against real local PostgreSQL
  content, covering request-time selection, direct loading, win/loss, answer
  reveal, Next Word exclusion/fresh state, navigation, and not-found behavior.

#### Issue 6 - Harden M5 database testing and deployment workflow

Status: Complete.

- Validate clean reset/seed, database lint/tests, and event isolation.
- Cover anonymous identity/Player creation and reuse in E2E.
- Preserve existing Connections and Wordle behavior.
- Document server-only secrets correctly and evaluate anonymous signup abuse
  controls before broad public launch.
- Do not claim server-authoritative gameplay.

Approved implementation scope:

- Keep one branch-protection-compatible CI `validate` job while separating
  database startup, reset, lint, pgTAP, type-drift, application, E2E, and build
  failures into clear steps.
- Add developer-facing local database lint, generated-type drift, and aggregate
  validation commands without wrapping hosted operations.
- Validate generated database types in memory through the pinned local
  Supabase CLI and installed Prettier.
- Add one real-browser anonymous Player-bootstrap/reload flow against local
  Supabase.
- Raise only the local/test anonymous Auth allowance enough for cross-browser
  tests and retries; hosted abuse controls remain unresolved before guest
  launch.
- Keep clean reset, local/test seed, production content SQL, and explicit
  hosted migration/content deployment as distinct documented boundaries.
- Add no new schema, product behavior, persistence records, or generic data
  abstraction.

Implemented:

- Added explicit local database lint and generated-type drift scripts plus a
  transparent `db:validate` lifecycle that starts Supabase, performs one clean
  reset, runs lint/pgTAP, checks types, and leaves the stack running.
- Added a cross-platform in-memory generated-type checker using the pinned
  repository CLI and installed asynchronous Prettier API without temporary or
  second committed type files.
- Kept one CI `validate` job while separating application checks, Supabase
  startup, clean reset, local environment mapping, database lint, pgTAP,
  generated-type drift, E2E, and build into diagnostic steps.
- Suppressed credential-bearing successful Supabase-start output in CI, masked
  the ephemeral local secret before `GITHUB_ENV`, and added no hosted secrets.
- Raised the local/test anonymous signup allowance from 30 to 100 for the
  cross-browser/retry workload without changing hosted Auth policy.
- Added a real-browser Player-bootstrap flow that verifies `204`, usable
  gameplay, a full reload in the same context, another `204`, and continued
  gameplay across Chromium, Firefox, and WebKit.
- Documented deterministic reconstruction, migration creation/deployment,
  explicit idempotent content application, intentional deletion, hosted drift,
  and local/hosted security boundaries.

Local validation completed:

- One clean database reset replayed all four migrations, both Event seed rows,
  and both ordered current-wedding game-content files.
- Database lint reported no errors and all four pgTAP files passed with 104
  assertions.
- Generated database types were refreshed and the non-mutating drift check
  passed.
- Format, format check, lint, typecheck, and all 127 unit/component tests
  passed.
- The focused anonymous Player-bootstrap E2E passed in Chromium, Firefox, and
  WebKit.
- The full Playwright suite passed with 30 of 30 tests across the configured
  browser projects.
- The production build and final `git diff --check` passed, and final scope
  review found no unrelated changes.

## M6 issue 1 - Establish trusted gameplay request boundary

Issue 1 adds a zero-argument, server-only `getCurrentPlayer()` resolver. It
verifies Supabase claims before resolving the trusted configured Event, then
queries the exact `(event_id, auth_user_id)` Player through the request-scoped
client and existing RLS. It returns only the Player ID and Event ID and
distinguishes `resolved`, `unauthenticated`, and `player_missing` outcomes.
Normal lookup does not use privileged access and does not auto-provision a
missing Player.

The async browser bootstrap may not finish before a future authoritative
gameplay request begins. Connections and Wordle authority work must gate or
safely retry that condition without falling back to client-computed outcomes.

M6 records these initial Attempt semantics without selecting a schema or
shared framework:

- One playthrough of one puzzle is one Attempt.
- Replay creates another Attempt and remains unrestricted.
- Attempt identity is separate from Player identity.
- Completion is separate from future score or leaderboard eligibility.
- Connections and Wordle may use different game-specific attempt persistence.
- No generic Attempt table or framework has been selected.

Issue 1 final validation completed successfully:

- `npm run gate` passed.
- All 158 unit/component tests passed.
- The full Playwright suite passed with 30 of 30 tests.
- The production build and `git diff --check` passed.
- `npm run check-scope` confirmed the expected Issue 1 scope.

## M6 issue 2 - Make Connections gameplay server-authoritative

Issue 2's backend foundation is complete and merged:

- Added event-, Player-, and puzzle-owned `connections_attempts` persistence
  with composite ownership constraints and a one-active-Attempt partial unique
  index.
- Persisted solved-group and incorrect-guess state plus a stable,
  attempt-specific opaque tile-token mapping. Stored state is decoded and
  validated before domain use.
- Added a Connections-specific server service for normal start/resume,
  explicit replay, authoritative guess evaluation through the existing pure
  domain rules, terminal completion, and sanitized snapshots.
- Added optimistic versions and conditional Event/Player/version updates.
  Stale requests and lost update races return the latest sanitized snapshot;
  duplicate guesses do not mutate state or increment versions.
- Added `POST /api/games/connections/attempts` and
  `POST /api/games/connections/attempts/[attemptId]/guesses`, both gated by the
  trusted current-Player boundary and returning fixed safe error contracts.
- Kept browser roles out of Attempt storage with RLS enabled. The server role
  has only the runtime `SELECT`, `INSERT`, and `UPDATE` grants.
- Added database, server-service, loader, and Route Handler coverage for
  ownership, active-attempt convergence, state/token sanitization, outcomes,
  terminal behavior, malformed or corrupt data, and concurrency conflicts.

Issue 2 deliberately did not modify the Connections page, board, controller,
reactions, or client payload. M6 Issue 3 owns that client cutover.

Issue 2 implementation validation completed in the Codex environment:

- A clean local database reset applied the new migration successfully.
- Database lint passed, and all five pgTAP files passed with 153 assertions.
- Generated database types were refreshed and the drift check passed.
- All 37 focused loader, server-service, and Route Handler tests passed.
- All 188 unit/component tests passed.
- Format, format check, lint, typecheck, and `git diff --check` passed.
- The full local validation gate passed before Issue 2 was merged.

## M6 issue 3 - Cut Connections client over to server-authoritative gameplay

Issue 3 implementation:

- Added a title/public-ID-only Connections preview query for the dynamic route;
  complete puzzle content remains behind explicit event-scoped server loaders.
- Exposed anonymous Player bootstrap readiness through a narrow games-layout
  context that always renders children and leaves Wordle behavior unchanged.
- Added a Connections-specific browser transport for Attempt initialization,
  guess submission, fixed error contracts, and sanitized snapshots.
- Reworked `useConnectionsGame` to store the authoritative server snapshot
  instead of reconstructing client domain state. Local state is limited to
  opaque-token selection, visual ordering/shuffle, feedback, timing, request
  state, and reaction history.
- Preserved immediate incorrect/one-away/duplicate feedback, delayed correct
  resolution, terminal reactions, accessibility, reduced motion, and local
  shuffle behavior without client-side outcome evaluation.
- Added retryable bootstrap/initialization/request handling, stale/invalid
  snapshot reconciliation, active/completed refresh resume, and authoritative
  replay that preserves completed state until success.
- Extended focused component and E2E coverage to verify authoritative flows and
  that unrevealed categories, groups, and semantic IDs do not cross initial
  render or Attempt-response boundaries.

Issue 3 and its post-deployment database round-trip optimization are complete.

Issue 3 implementation validation completed in the Codex environment:

- All 39 focused preview, bootstrap, Proxy, API-client, and Connections board
  tests passed.
- All 197 unit/component tests passed.
- All 12 targeted Connections and Player-bootstrap Playwright tests passed
  across Chromium, Firefox, and WebKit, including render/API solution-exposure
  assertions and active/completed resume flows.
- Format, format check, lint, typecheck, and `git diff --check` passed.
- The production build and full Playwright suite passed in the subsequent
  local validation gate.

## M6 issue 4 - Make Wordle gameplay server-authoritative (backend)

Issue 4 backend implementation:

- Added Event-, Player-, and puzzle-owned `wordle_attempts` persistence with
  canonical submitted guesses, optimistic versions, terminal timestamps,
  composite ownership constraints, and one active Attempt per Player/puzzle.
- Reconstructs evaluations and status through existing pure Wordle rules rather
  than persisting redundant evaluation truth.
- Added start/resume/new lifecycle behavior, authoritative guess submission,
  exact conditional updates, conflict reconciliation, and sanitized snapshots.
- Uses one owned Attempt plus embedded hidden-puzzle read for ordinary guesses,
  matching the optimized Connections authority pattern.
- Added a committed 8,585-word server-only accepted-guess Set derived from the
  pinned SCOWL/ESDB size-70 American-English list with reproducible generation
  and complete third-party notices.
- Invalid dictionary words return an unchanged snapshot without consuming an
  Attempt or version and without issuing a database update.
- Added Wordle-specific Route Handlers and database/content/domain/service/route
  tests without changing the existing Wordle client, routes, board, or keyboard.

Issue 4 is complete and merged. Issue 5 owns the browser cutover to these APIs.

Issue 4 implementation validation completed in the Codex environment:

- All 73 focused Wordle domain, content, dictionary, service, validation, and
  Route Handler tests passed.
- All 240 unit/component tests passed.
- The database validation gate passed with clean migration replay, database
  lint, 201 pgTAP assertions, and generated-type drift verification.
- Format, format check, lint, typecheck, production build, `git diff --check`,
  and scope review passed.

## M6 issue 5 - Cut Wordle client over to server-authoritative gameplay

Issue 5 implementation:

- Changed the dynamic Wordle route to load only a public-ID preview; the route,
  board, controller, and initial render payload no longer receive the answer.
- Added a Wordle-specific browser transport with runtime validation for
  sanitized authoritative Attempt and error snapshots.
- Reworked `useWordleGame` around `WordleAttemptSnapshot`; only current input,
  feedback, request state, shake, and reveal timing remain client-local.
- Gated initialization on anonymous Player readiness and added retryable
  initialization/submission failures without client-authority fallback.
- Added explicit resume/new lifecycle handling, unique selected-game request
  markers for repeated same-puzzle initialization, and successful-only URL
  canonicalization.
- Preserved server-accepted row reveal while delaying its authoritative
  keyboard colors until reveal completion. Restored green correct, amber
  present, gray absent, and neutral unused key presentation with status
  precedence.
- Added invalid-word feedback that preserves editable input and consumes no
  displayed Attempt, plus larger mobile keyboard touch targets without changing
  horizontal flex behavior.

Issue 5 implementation validation completed:

- All 39 focused Wordle content, selector, API-client, and board/controller
  tests passed.
- All 244 unit/component tests passed.
- All 27 targeted Wordle Playwright tests passed across Chromium, Firefox, and
  WebKit.
- The complete Playwright suite passed all 54 tests: 18 each in Chromium,
  Firefox, and WebKit.
- Format, format check, lint, typecheck, production build, `git diff --check`,
  and scope review passed.

Issue 5 and M6 are complete.

## M7 issue 2 - Implement Strands domain rules and G1 puzzle

Issue 2 implementation:

- Added the independent pure Strands puzzle and immutable game-state model for
  a fixed 8-by-6, row-major grid.
- Added adjacency, append/backtrack, claimed-tile exclusion, exact forward or
  reverse path matching, discovery, duplicate defense, neutral non-theme
  handling, and derived completion rules.
- Added runtime validation for dimensions, canonical answers, paths,
  adjacency, spelling, overlap, exact 48-tile coverage, and opposite-edge
  spangram coverage.
- Added the local `the-big-day` G1 puzzle with the locked theme clue, six theme
  words, `WEDDINGDAY` spangram, explicit grid, and explicit answer paths.
- Kept Strands independent from React, routes, the database, Attempts, and the
  Connections and Wordle implementations.

Issue 2 implementation validation completed:

- All 27 focused Strands domain, validation, and content tests passed.
- All 271 unit/component tests passed.
- Format, format check, lint, typecheck, production build, `git diff --check`,
  and scope review passed.
- Playwright was not run because Issue 2 adds no route or UI behavior.

Issue 2 is complete and merged.

## M7 final integration - Integrate Strands into the game hub and persist local progress

Status: Implementation and local validation complete; awaiting PR merge.

Implemented:

- Added Strands as the third explicit game on the Wedding Games home page.
- Added `/games/strands` as a client-side entry boundary that resumes the most
  recently visited valid puzzle and falls back to `wedding-01`.
- Added a versioned Strands-specific `localStorage` boundary rather than a
  generic cross-game persistence framework.
- Persisted found answers and the active hint independently for each puzzle.
- Kept partial selected paths, feedback, focus, and pointer state transient.
- Preserve progress when using Next Puzzle, leaving Strands, or refreshing.
- Play Again clears only the current puzzle's persisted progress.
- Invalid, malformed, stale, or puzzle-inconsistent stored values fail safely.
- Kept Strands browser-authoritative for M7. Server-backed Attempts, solution
  protection, scoring, and leaderboards remain deferred.

Validation completed:

- The full `npm run gate` passed.
- Focused Strands persistence, board, and puzzle-navigation tests passed.
- Focused Chromium Strands browser coverage passed.
- Manual first-entry, resume, multi-puzzle progress, hint restoration,
  refresh, and transient-selection behavior passed.

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

Open and merge the final M7 Strands hub/persistence PR after CI and the Vercel
preview pass. Then close M7 and begin server-authoritative Strands work:
persisted Attempts, server-side path evaluation, sanitized snapshots, solution
protection, refresh/resume behavior, and client cutover. Scoring and
leaderboards remain deferred until after Strands authority.
