# Project Status

Last updated: 2026-08-16

## Current milestone

**M2 - Production Game Structure**

M1, the Connections Prototype milestone, is complete.

M2 Issue 1, separating Connections application content from automated test
fixtures, is complete.

M2 Issue 2, extracting the Connections gameplay controller from the rendering
component, is complete.

Current work is M2 Issue 3, adding a Connections-specific puzzle-loading
boundary.

## Product direction

The wedding-games site should evolve into a small game hub.

Planned navigation direction:

```text
/
  Wedding games home page
  -> Connections
  -> future games

/games/connections/[puzzleId]
  Individual Connections puzzle
```

The root page currently serves the Connections prototype, but M2 should move toward a real home page with cards/buttons that let guests choose a game.

Do not build a generic game platform prematurely. Connections is the only implemented game today.

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

  content/
    connections/
      developmentPuzzle.ts
      getConnectionsPuzzle.ts

  domain/
    connections/
      gameplay.ts
      types.ts
      validation.ts

  features/
    connections/
      ConnectionsGameBoard.tsx
      ConnectionTile.tsx
      useConnectionsGame.ts

tests/
  fixtures/
    connections.ts
  unit/
    content/connections/
    domain/connections/
    features/connections/
  e2e/
    smoke.spec.ts
    connections.spec.ts

docs/
  adr/
  architecture.md
  development.md
  requirements.md
```

## Current Connections content

`src/content/connections/developmentPuzzle.ts` contains the local application
puzzle, with wedding/general Connections-style sample groups such as:

- Types of cake
- Types of cats
- Things that ring
- Contains bow

This content remains useful for exercising more realistic labels and mobile
wrapping. Unit and component tests now use the stable fixture in
`tests/fixtures/connections.ts`. The end-to-end tests intentionally reference
the application puzzle because they exercise the puzzle rendered by the real
route. Application routes access local Connections content through
`getConnectionsPuzzle(puzzleId)` rather than importing individual puzzle files.

## M2 design

M2 should turn the successful prototype into maintainable production structure without rewriting the working game.

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

### Current M2 issue 3 - Add puzzle-loading boundary

Status: Implementation complete; awaiting full local validation and merge.

The UI should not permanently import a hardcoded puzzle directly.

Introduce a stable interface conceptually similar to:

```ts
getConnectionsPuzzle(puzzleId);
```

For M2 this may load local static content.

The purpose is to let M3 later replace the implementation with Supabase/backend loading without requiring the Connections UI to know the storage mechanism.

Implemented:

- Added an asynchronous Connections-specific lookup boundary under
  `src/content/connections/`.
- Kept the local puzzle collection private to the loader implementation.
- Return `null` for unknown puzzle IDs.
- Validate found puzzles with the existing domain validator and throw a clear
  content error when stored data is invalid.
- Updated the root route to load its puzzle through the boundary without
  changing visible behavior.

### Proposed M2 issue 4 - Add real game routes and home page

Move toward:

```text
/
  game-selection home

/games/connections/[puzzleId]
  Connections puzzle route
```

The home page should eventually show available game cards/buttons.

This issue should focus on simple usable navigation, not final wedding visual design.

### Proposed M2 issue 5 - Introduce minimal shared game shell

Only extract presentation/layout concepts that are already clearly shared or platform-level, such as:

- game page width/container
- common title/header area
- future game navigation hooks
- loading/not-found presentation if needed

Do not move Connections-specific concepts such as mistakes, guesses, solved groups, or tile selection into the shared shell.

## Deferred beyond M2

These are intentionally not part of M2:

- Supabase persistence
- anonymous player-session persistence
- server-authoritative guess submission
- leaderboard
- scoring
- anti-cheat
- daily puzzle scheduling
- guest identity/profile flows
- cocktail-hour team/social mode
- second game implementation
- generic multi-game engine

These should be handled in later milestones once the production structure is stable.

## Existing ADR decisions

The current ADR set includes:

- ADR 0001: Next.js full-stack application
- ADR 0002: PostgreSQL via Supabase
- ADR 0003: anonymous player sessions
- ADR 0004: server-authoritative gameplay

Do not create a new ADR for small refactors. Add one only when M2 makes a durable architectural decision that warrants preserving the reasoning.

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
- repository located on `E:` drive

Next.js sometimes reports a slow-filesystem warning for the `E:` drive. It has not been a functional blocker.

## Full validation gate

Before merging an M2 implementation issue:

```powershell
npm run format; npm run format:check; npm run lint; npm run typecheck; npm test; npm run test:e2e; npm run build;
```

CI and Vercel preview should also be green before merge.

## Immediate next step

Run the full local validation gate for M2 Issue 3, then merge the
Connections-specific puzzle-loading boundary before starting M2 Issue 4.

The home-page/game-selection direction is accepted at a high level: the root should become a game hub, with individual games living under game-specific routes.
