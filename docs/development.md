# Development Environment

## Overview

This document describes the local tooling required to develop the Wedding Games application.

Application-specific setup instructions will be expanded as the project is implemented.

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

The project currently requires Node.js 20.9 or newer because of the planned Next.js application stack.

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

Linting-specific editor behavior will be configured after the project's ESLint configuration is established.

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

## Application Validation

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
