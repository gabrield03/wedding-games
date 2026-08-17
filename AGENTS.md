# AGENTS.md

## Project

This repository contains a custom wedding-games web application. The project should be useful for the wedding while also being a professionally structured portfolio project.

The current first game is a personalized Connections-style puzzle. Future games may be added, but do not introduce a generic multi-game framework before repeated requirements justify one.

## Before starting work

For non-trivial repository work, read `docs/project-status.md` first for the current milestone, completed work, and immediate next step. Read the relevant architecture/requirements/ADR documents when the task touches those decisions.

## Product principles

- The site should eventually have a home page where guests can choose among available games.
- Games are primarily for pre-wedding use. Cocktail-hour social play may be appropriate later.
- Do not design reception-table phone gameplay that discourages guests from interacting in person.
- Favor personalized wedding-themed content over third-party game APIs.
- Keep the experience polished, mobile-friendly, accessible, and easy for non-technical guests.
- Do not use emojis in project artifacts, documentation, code comments, or UI copy unless explicitly requested.

## Engineering approach

- Prefer simple, maintainable designs over speculative abstractions.
- Generalize the platform around games only when there is a demonstrated shared need.
- Keep Connections-specific rules in the Connections domain.
- Keep domain/game rules independent from React rendering.
- Keep puzzle/content loading behind a boundary that can later move from local content to a backend.
- Avoid over-engineering for wedding-scale traffic.
- Preserve the existing ADR decisions unless there is a clear reason to revisit them.
- Explain meaningful architectural decisions briefly when making them.
- Make focused changes. Do not mix unrelated refactors into an issue.

## Current stack

- Next.js 16 App Router
- React
- TypeScript
- Tailwind CSS
- npm
- Vitest + React Testing Library
- Playwright
- Vercel
- PostgreSQL via Supabase planned for later backend work
- GitHub Actions CI

## Current architecture

- `src/domain/connections/`
  - Static puzzle/domain types
  - Runtime validation
  - Pure gameplay rules and state transitions
- `src/features/connections/`
  - Connections React UI and interaction state
- `src/app/`
  - Next.js application routes and global styling
- `tests/unit/`
  - Domain and component tests
- `tests/e2e/`
  - Cross-browser Playwright flows
- `docs/adr/`
  - Architectural decisions

The Connections domain should remain pure. React components/controllers may coordinate UI state, animations, feedback, and domain calls, but should not duplicate game rules.

## Established architecture decisions

- Use Next.js as the initial full-stack framework.
- Use PostgreSQL through Supabase when persistence is introduced.
- Use anonymous player sessions later rather than requiring accounts/passwords.
- Move toward server-authoritative gameplay when competitive/scored functionality is introduced.
- Do not build a universal `GameEngine<T...>` abstraction during M2.
- Puzzle content should eventually be separable from test fixtures and loaded through a stable interface.

## Development workflow

- Work issue-by-issue and keep the pace reasonably quick.
- Ask high-leverage product/architecture questions when needed, but do not stop for minor implementation or naming decisions that can be resolved safely.
- When the requested change is clear, inspect the relevant code, implement it, and verify it rather than repeatedly asking for confirmation.
- Do not routinely run or report `git status` as a checkpoint.
- The user is comfortable with normal Git basics. Give branch/commit/PR names when useful; do not over-explain routine Git commands unless asked.
- Do not silently change product behavior while fixing tests.
- When tests fail after fixture/content changes, prefer making tests assert behavior rather than hardcoding incidental fixture labels.

### Validation execution

Codex should run fast validation during implementation:

- formatting
- formatting check
- lint
- typecheck
- unit/component tests
- targeted tests relevant to the change

Do not routinely run long-running Playwright E2E suites or production builds in the Codex execution environment unless specifically requested.

Before commit or PR, the user will run the full validation gate in their normal local terminal, including:

- `npm run test:e2e`
- `npm run build`

If the user's local validation reports a failure, diagnose and fix that failure before considering the issue complete.

If the Codex PowerShell environment blocks `npm.ps1`, use `npm.cmd` rather than changing the machine's PowerShell execution policy.

## Quality requirements

Codex should run the fast validation checks described above during implementation. Before merge, the user will run the full local validation gate:

```powershell
npm run format; npm run format:check; npm run lint; npm run typecheck; npm test; npm run test:e2e; npm run build;
```

Current important scripts include:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run test:e2e:ui`

Do not treat the known slow-filesystem warning on the `E:` drive as a product defect unless it begins causing actual failures.

## UI and accessibility expectations

- Preserve a four-column Connections board where practical.
- Support small mobile widths; the M1 implementation was manually verified down to 320px.
- Maintain keyboard usability with native buttons and visible focus states.
- Keep `aria-pressed` on selectable Connections tiles.
- Keep live-region feedback for game outcomes.
- Respect `prefers-reduced-motion`.
- Avoid unnecessary layout shift when feedback appears.
- Interaction feedback should feel responsive:
  - Incorrect, one-away, and duplicate guesses shake selected tiles.
  - Correct guesses visibly confirm before resolving into a solved group.

## Testing principles

- Domain tests should validate Connections rules independently from the UI.
- Component tests should validate React/domain integration and UI behavior.
- E2E tests should validate major real-browser flows rather than duplicate every unit test.
- Tests that use puzzle content should derive labels/IDs from fixtures instead of assuming particular values such as `A`, `B`, or a specific group ID.
- Keep test fixtures stable and separate from production content as M2 evolves.

## Documentation

Keep these aligned when architecture or workflow materially changes:

- `README.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/project-status.md`
- applicable ADRs

Use `docs/project-status.md` for current milestone/progress information. Keep `AGENTS.md` focused on durable rules and conventions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
