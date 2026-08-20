# Development Environment

## Overview

This document describes the local tooling required to develop the Wedding Games application.

This document describes the setup, validation, testing, and deployment workflow
used by the current application.

## Required Tools

### Git

Git is used for source control and GitHub integration.

Current development environment:

```text
Git 2.53.0
```

A recent Git release is recommended.

Verify installation:

```bash
git --version
```

### Node.js

Node.js is required to run the application and JavaScript/TypeScript development tooling.

Current development environment:

```text
Node.js 24.19.0
```

The project requires Node.js 20.9 or newer for the current Next.js 16 application
stack.

Verify installation:

```bash
node --version
```

### npm

npm is the initial package manager for the project.

Current development environment:

```text
npm 11.17.0
```

Verify installation:

```bash
npm --version
```

### Docker Desktop

The local Supabase stack runs in Docker containers. On the primary Windows
development environment, Docker Desktop uses Linux containers through its WSL
2 backend.

Verify that both the Docker client and engine are available before running
database commands:

```powershell
wsl --version
docker version
docker info
```

The first local Supabase start downloads its container images and may take
several minutes. Docker Desktop must remain running while the local database is
used.

### Supabase CLI

The Supabase CLI is pinned as a project development dependency. Do not install
or rely on a global CLI version. npm scripts resolve the repository-local
binary.

Verify the installed version after `npm install`:

```powershell
npx.cmd supabase --version
```

No hosted Supabase account, project, access token, or database password is
required for the current local workflow.

### Visual Studio Code

Visual Studio Code is the primary development environment used for the project.

Current development environment:

```text
Visual Studio Code 1.132.0
```

Verify installation:

```bash
code --version
```

## VS Code Extensions

The repository contains workspace extension recommendations in:

```text
.vscode/extensions.json
```

Current recommended extensions:

- ESLint
- Prettier - Code formatter
- GitHub Actions

VS Code should prompt developers to install recommended extensions when the repository is opened.

Additional extensions should only be added when they support an established project requirement.

## VS Code Workspace Settings

Project-specific editor configuration is stored in:

```text
.vscode/settings.json
```

Current workspace behavior includes:

- Format files automatically on save
- Use Prettier as the default formatter

Linting behavior is provided by the ESLint VS Code extension, while project lint rules are defined in `eslint.config.mjs`.

## Integrated Terminal

Development commands should be executable from the VS Code integrated terminal.

On the initial Windows development environment, the terminal uses PowerShell.

Open the integrated terminal using:

```text
Ctrl + `
```

or through:

```text
View > Terminal
```

## Windows PowerShell

On Windows, npm PowerShell scripts may be blocked by the default PowerShell execution policy.

The initial development environment uses:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

The resulting `CurrentUser` execution policy is:

```text
RemoteSigned
```

This setting allows locally created scripts to execute while limiting the scope of the policy change to the current Windows user.

Developers should evaluate execution-policy changes according to their own machine and security requirements rather than applying this setting automatically.

## Git Identity

Git commits should use an identity associated with the developer's GitHub account.

Verify the configured identity with:

```bash
git config --global user.name
git config --global user.email
```

Personal email addresses or other developer-specific Git configuration should not be stored in repository files.

## Repository Setup

Clone the repository:

```bash
git clone https://github.com/gabrield03/wedding-games.git
```

Enter the repository:

```bash
cd wedding-games
```

Open it in Visual Studio Code:

```bash
code .
```

## Application Setup

Install project dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

The application is available by default at:

```text
http://localhost:3000
```

Stop the development server with:

```text
Ctrl+C
```

## Local Database Setup

Database migrations under `supabase/migrations/` are the schema source of
truth. `supabase/seed.sql` contains deterministic local/test Event data, and
versioned files under `supabase/data/` contain current-event application
content applied afterward. Their order is declared in `supabase/config.toml`.
The generated database contract is committed at
`src/types/database.generated.ts`.

Start the local Supabase stack:

```powershell
npm.cmd run db:start
```

Copy `.env.example` to the ignored `.env.local` file. Use the current local
project URL, publishable key, and secret key reported by the Supabase CLI; do
not commit those working credentials:

```powershell
npx.cmd supabase status -o env
```

The application variables are:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
CURRENT_EVENT_SLUG=current-wedding
```

Only the URL and publishable key are browser-safe. The secret key and current
Event slug remain server-only. Local anonymous Auth is enabled through the
committed Supabase configuration.

Reset the disposable local database, replay every migration, and apply the
configured seed/data files:

```powershell
npm.cmd run db:reset
```

Lint the local database schema:

```powershell
npm.cmd run db:lint
```

Database warnings remain visible, but only actual lint errors fail validation.

Run the pgTAP database tests:

```powershell
npm.cmd run db:test
```

Regenerate the TypeScript database types after any migration change:

```powershell
npm.cmd run db:types
```

Verify that the committed generated types match the local public schema
without modifying the file:

```powershell
npm.cmd run db:types:check
```

Run the complete local database validation sequence from a stopped or running
stack:

```powershell
npm.cmd run db:validate
```

This starts Supabase if necessary, performs one clean reset, lints the schema,
runs pgTAP, and checks generated-type drift. It leaves the local stack running
for development or application testing.

Stop the local stack when it is no longer needed:

```powershell
npx.cmd supabase stop
```

The reproducibility sequence is:

```text
start local Supabase
  -> reset the database
  -> replay migrations
  -> apply deterministic local/test Event seed data
  -> apply current-wedding Connections content
  -> apply current-wedding Wordle content
  -> lint the schema
  -> run database tests
  -> verify generated database types
```

Reproducibility means the same schema, Event slugs, public puzzle IDs, puzzle
content, row counts, and Event isolation are reconstructed from repository
state. Generated internal UUIDs and timestamps do not need to remain identical
between resets. One clean reset is sufficient for normal validation; resetting
twice adds little evidence because each reset begins from an empty database.

The base seed creates exactly two Events: `current-wedding`, representing the
local current Event, and `isolation-test`, a test-only boundary used to verify
isolation behavior. It creates no Auth users or Players. The ordered
`current-wedding-connections.sql` data file then upserts the existing
production Connections puzzle for `current-wedding` only and fails clearly if
that Event is missing. `current-wedding-wordle.sql` runs next and upserts the
existing ten Wordle puzzles for that same Event only. Neither content file
adds production data to `isolation-test`. Local/test reset data is not an
implicit hosted production bootstrap process.

The current schema and application include Event ownership, event-scoped
Players and both game-specific puzzle tables, cookie-backed anonymous Auth,
trusted current-Event resolution, and automatic idempotent Player bootstrap
for game routes. An isolated server-only secret client may select Events,
Connections puzzles, and Wordle puzzles and insert/select Players; normal
clients keep the restrictive RLS posture.

The configured anonymous-signup rate in `supabase/config.toml` is intentionally
set for local cross-browser and retry-heavy testing. It does not configure or
approve the hosted guest-launch abuse policy.

### Schema Migration Workflow

Create a future migration with the pinned project CLI:

```powershell
npx.cmd supabase migration new <descriptive-name>
```

Then:

1. Edit and review the generated SQL.
2. Start local Supabase and run a clean reset/replay.
3. Run database lint and pgTAP.
4. Regenerate `src/types/database.generated.ts` with `npm.cmd run db:types`.
5. Confirm `npm.cmd run db:types:check` passes.
6. Run application validation, E2E, and the production build.
7. Inspect the linked migration state.
8. Run a linked dry run and confirm that only expected migrations are listed.
9. Push the migration explicitly.
10. Recheck linked migration state and verify the hosted schema/state.

The linked commands are deliberately explicit rather than npm aliases:

```powershell
npx.cmd supabase migration list --linked
npx.cmd supabase db push --linked --dry-run
npx.cmd supabase db push --linked
npx.cmd supabase migration list --linked
```

Use a linked schema diff only when investigating unexpected hosted drift after
the expected migration history has been reconciled:

```powershell
npx.cmd supabase db diff --linked --schema public
```

Do not automate linked migration pushes in GitHub Actions. They require an
intentional review of the target project and expected migration list.

### Production Content Update Workflow

Connections and Wordle production content remain version-controlled SQL. To
change either game:

1. Edit only the appropriate file under `supabase/data/`.
2. Perform a clean local reset, which applies all configured files in order.
3. Reapply the changed content file once against the populated local database
   to verify hosted-style idempotency.
4. Run database and application validation.
5. Ensure any required schema migration is already present in the hosted
   project.
6. Apply only the changed content file explicitly to the linked project.
7. Verify the hosted Event scope, public IDs, row counts, and content.
8. Verify the Vercel Preview as appropriate.

For example, local reapplication and hosted application use the same reviewed
file with an explicit target:

```powershell
npx.cmd supabase db query --local --file supabase/data/current-wedding-connections.sql
npx.cmd supabase db query --linked --file supabase/data/current-wedding-connections.sql

npx.cmd supabase db query --local --file supabase/data/current-wedding-wordle.sql
npx.cmd supabase db query --linked --file supabase/data/current-wedding-wordle.sql
```

Run only the local/linked pair for the file actually being changed. The full
block above illustrates both game-specific workflows; it is not one combined
deployment command.

`ON CONFLICT ... DO UPDATE` updates existing rows but does not delete a row
that was removed from the source file. An intentional production-content
deletion must be an explicit, reviewed `DELETE` scoped to the trusted Event and
public puzzle identity. Never infer deletion from absence in an upsert list.

Do not use `supabase/seed.sql`, `db push --include-seed`, or the
`isolation-test` Event as part of hosted deployment. Dashboard-only schema or
content edits are not the normal workflow; repository migrations and content
SQL remain the source of truth.

## Code Quality

The project uses ESLint for static code-quality checks, Prettier for formatting, and the TypeScript compiler for explicit type checking.

### Linting

Run ESLint:

```bash
npm run lint
```

### Formatting

Format supported project files:

```bash
npm run format
```

Check formatting without modifying files:

```bash
npm run format:check
```

`format:check` is intended for automated validation such as CI, while `format` is intended for local development.

### Type Checking

Run the TypeScript compiler without generating output:

```bash
npm run typecheck
```

### Production Build

Create a production build:

```bash
npm run build
```

Before changes are merged, the following commands should complete successfully:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
```

Formatting behavior is defined by `.prettierrc` and `.prettierignore`.

ESLint configuration is maintained in `eslint.config.mjs`.

Repository text files use LF line endings as defined by `.gitattributes`.

## Unit Testing

The project uses Vitest for unit testing.

Run the unit test suite once:

```bash
npm test
```

Run Vitest in watch mode during development:

```bash
npm run test:watch
```

Unit tests are stored under:

```text
tests/unit/
```

Current unit testing infrastructure uses:

- Vitest as the test runner
- jsdom as the browser-like test environment
- React Testing Library for React component testing

Core game logic should be written so that rules, scoring, validation, and completion behavior can be tested independently from the user interface where practical.

Before changes are merged, the unit test suite should complete successfully.

The current suite includes independent Connections and Wordle domain tests,
game-specific content-loader tests, and React component tests for gameplay
integration, accessibility behavior, and interaction state.

## End-to-End Testing

The project uses Playwright for browser-level end-to-end testing.

Run the E2E test suite:

```bash
npm run test:e2e
```

Open Playwright's interactive test UI:

```bash
npm run test:e2e:ui
```

E2E tests are stored under:

```text
tests/e2e/
```

The current Playwright configuration runs tests against:

- Chromium
- Firefox
- WebKit

Playwright automatically starts the local Next.js development server for test execution.

The smoke coverage exercises both explicit game-hub entries, request-time
Wordle puzzle selection, direct puzzle URLs, navigation back to the hub, and
unknown-puzzle not-found behavior. Game-specific E2E specifications cover the
major Connections completion/loss/restart flows and Wordle completion/loss/Next
Word flows.

End-to-end tests should be used for complete user flows and browser behavior that are better validated through a real browser than through isolated unit tests.

Examples of future E2E flows include:

```text
Open Application
    ->
Create Player
    ->
Start Puzzle
    ->
Submit Gameplay Actions
    ->
Complete Puzzle
    ->
Receive Score
    ->
View Leaderboard
```

Unit tests and E2E tests have separate responsibilities:

```text
Vitest
    -> unit and component-level behavior
    -> tests/unit/

Playwright
    -> browser-level user flows
    -> tests/e2e/
```

Generated Playwright reports and test artifacts are excluded from source control.

## Continuous Integration

The project uses GitHub Actions for continuous integration.

The CI workflow is defined in:

```text
.github/workflows/ci.yml
```

CI runs automatically when:

- A pull request targets `main`
- A commit is pushed to `main`

The validation job performs the following steps:

```text
Checkout Repository
    ->
Install Node.js
    ->
Install Dependencies with npm ci
    ->
Check Formatting, Lint, and Typecheck
    ->
Run Unit/Component Tests
    ->
Start Local Supabase
    ->
Clean Database Reset and Configured Data Replay
    ->
Map Local Supabase Status to Application Environment
    ->
Database Lint
    ->
pgTAP Database Tests
    ->
Generated Database Type Drift Check
    ->
Install Playwright Browsers
    ->
Run End-to-End Tests
    ->
Build Application
```

CI uses one branch-protection-compatible `validate` job with distinct steps so
dependency, application, database, browser, and build failures remain easy to
identify. It starts and resets the local Supabase stack after DB-independent
application checks, then maps the CLI's `API_URL`, `PUBLISHABLE_KEY`, and
`SECRET_KEY` status values to the application's environment variable names.
The ephemeral local secret is masked before it is written to the GitHub Actions
environment.

Database lint, pgTAP, and generated-type drift are first-class CI checks. E2E
and build keep using the same running local stack, so both PostgreSQL-backed
games and anonymous Player bootstrap are exercised without hosted credentials.
GitHub Actions does not receive the hosted Supabase secret, hosted database
password, or Vercel secrets. The runner is ephemeral, so CI does not add a
separate Supabase stop step.

The `main` branch is protected by a GitHub branch ruleset.

Changes to `main` must be submitted through a pull request, and the required `validate` CI status check must pass before the pull request can be merged.

Unresolved pull request conversations must also be resolved before merging.

## Deployment

The application is deployed through Vercel using the repository's GitHub integration.

### Preview Deployments

Pull requests automatically receive an isolated Vercel preview deployment.

Preview deployments allow changes to be tested in a publicly accessible environment without modifying the production application.

The expected development workflow is:

```text
Create Feature Branch
    ->
Develop and Test Locally
    ->
Commit and Push Branch
    ->
Open Pull Request
    ->
GitHub Actions Validation
    +
Vercel Preview Deployment
    ->
Review and Test Preview
    ->
Merge Pull Request
```

### Production Deployment

The `main` branch is the production branch.

After a pull request is merged into `main`, Vercel automatically creates a new production deployment.

The current temporary production URL is:

```text
https://wedding-games-ten.vercel.app/
```

A custom wedding domain may replace or point to this deployment later.

### Branch Cleanup

After a pull request has been merged and the production deployment has been verified, the merged feature branch should normally be deleted remotely and locally.

A typical cleanup workflow is:

```bash
git checkout main
git pull
git branch -d <branch-name>
git fetch --prune
```

This keeps local and remote branch references clean after completed work.
