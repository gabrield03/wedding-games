# ADR-0001: Use Next.js as the Initial Full-Stack Application

## Status

Accepted

## Date

2026-08-14

## Context

Wedding Games requires a mobile-first web interface and server-side functionality for capabilities such as:

- Player session management
- Puzzle retrieval
- Game action validation
- Score calculation
- Leaderboard queries
- Database access

The application is expected to serve a relatively small number of users and will initially be developed and maintained by a single developer.

Separating the frontend and backend into independently deployed applications would introduce additional infrastructure, deployment, configuration, and development overhead before the project has demonstrated a need for that separation.

At the same time, the project should provide meaningful experience with both frontend and backend development.

## Decision

Use Next.js with TypeScript as the initial full-stack application framework.

The application will use:

- React for the user interface
- Next.js App Router for routing and application structure
- Next.js server-side capabilities for backend application logic
- Route Handlers or other appropriate server-side Next.js mechanisms for HTTP APIs
- TypeScript across both client and server code

The frontend and backend will initially be deployed as a single application.

Game-specific domain logic should remain separated from framework-specific request handling where practical.

## Rationale

This approach provides:

- A single language across the initial application
- A unified development environment
- Server-side capabilities without requiring a separate backend deployment
- Straightforward integration with managed hosting platforms
- Support for mobile-first React development
- Reduced operational complexity for a single-developer project
- The ability to introduce a separate backend later if requirements justify it

Using a full-stack framework also allows the project to include meaningful backend concepts such as sessions, API design, validation, persistence, and server-authoritative gameplay without prematurely introducing additional services.

## Alternatives Considered

### Separate React Frontend and Backend Service

Examples include:

- React with an Express backend
- React with a Spring Boot backend
- React with a FastAPI backend

This would provide a stronger physical separation between frontend and backend responsibilities.

It was not selected initially because it would require separate application configuration, deployment, and potentially hosting without solving a current requirement.

A separate backend remains a possible future architecture.

### Static React Application

A purely static frontend would be simpler initially.

It was not selected because the planned application requires server-side functionality for persistent players, secure score validation, database access, and leaderboards.

### Native Mobile Application

Native iOS or Android applications were not selected because requiring guests to install an application would create unnecessary friction.

The product requirements favor a web application accessible directly through a browser.

## Consequences

### Positive

- Frontend and backend development can occur in one repository.
- TypeScript can be used throughout the application.
- Local development is simpler than maintaining multiple services.
- Deployment can initially remain simple.
- Shared types may be reused across client and server boundaries where appropriate.
- The architecture remains sufficient for the expected application scale.

### Negative

- Frontend and backend concerns may become too tightly coupled if boundaries are not maintained intentionally.
- Framework-specific code could spread into domain logic.
- A future requirement may justify extracting backend functionality into an independent service.
- The project will provide less immediate experience operating separately deployed frontend and backend services.

## Implementation Guidance

Framework-specific code should not unnecessarily contain core game rules.

For example:

```text
HTTP Route Handler
        |
        v
Application / Domain Logic
        |
        v
Game Engine
        |
        v
Persistence Layer
```

Rather than:

```text
HTTP Route Handler
        |
        +-- Request parsing
        +-- Database queries
        +-- Connections rules
        +-- Score calculation
        +-- Leaderboard logic
```

Keeping these boundaries clear should make the code easier to test and make future architectural changes less disruptive.

## Revisit Conditions

This decision should be reconsidered if:

- Backend complexity grows substantially
- Independent frontend and backend deployments become useful
- Multiple clients require the same backend APIs
- Background processing becomes a significant application requirement
- Scaling characteristics differ substantially between frontend and backend workloads
- A different backend technology provides a meaningful product or engineering benefit

If this decision changes, a new ADR should supersede this record rather than modifying the historical decision.
