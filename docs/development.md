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
Lint
    ->
Check Formatting
    ->
Type Check
    ->
Run Unit Tests
    ->
Install Playwright Browsers
    ->
Run End-to-End Tests
    ->
Build Application
```

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
