# Requirements

## Status

Version: 0.1

These requirements define the current direction of the Wedding Games project. They are expected to evolve as the product, architecture, available development time, and wedding plans change.

## Product Goal

Build a mobile-first web platform for personalized wedding games that guests can play primarily before the wedding, with persistent player identity, server-validated gameplay, scoring, and leaderboards.

The application should complement the wedding experience without encouraging guests to disengage from social interaction during the reception.

## Functional Requirements

### FR-001: Anonymous Player Access

Players must be able to begin using the application without creating a traditional account with a username and password.

### FR-002: Player Identity

The system must maintain a persistent player identity so that game attempts and scores can be associated with the same player across sessions on the same device.

### FR-003: Game Discovery

Players must be able to view currently available games and puzzles.

### FR-004: Game Participation

Players must be able to start and complete available puzzles through a mobile-friendly interface.

### FR-005: Multiple Game Types

The system must support multiple game types without requiring major changes to shared application functionality such as player identity, persistence, and leaderboards.

### FR-006: Persistent Attempts

The system must persist player attempts and completion state.

### FR-007: Server-Validated Gameplay

Competitive gameplay actions and final scores must be validated by the server rather than trusted directly from the client.

### FR-008: Scoring

The system must calculate a score for completed puzzles using rules appropriate to each game type.

### FR-009: Leaderboards

Players must be able to view ranked scores.

The initial implementation should support an overall leaderboard and may later support game-specific or time-based leaderboards.

### FR-010: Puzzle Availability

The system must support controlling whether a puzzle is available for play.

Scheduled releases may be added later.

### FR-011: Extensible Puzzle Content

Puzzle content must be stored separately from game presentation logic so that new puzzles can be created without modifying the game engine.

## Non-Functional Requirements

### NFR-001: Mobile-First Design

The primary user experience must be designed for modern mobile browsers.

Desktop browsers should remain usable.

### NFR-002: Low User Friction

The application should minimize required setup for wedding guests.

Traditional account registration should not be required for core gameplay.

### NFR-003: Security

Secrets, credentials, and sensitive production configuration must not be committed to source control.

User-controlled content must be handled safely.

### NFR-004: Server Authority

The server must remain authoritative for score-sensitive state and leaderboard results.

### NFR-005: Reliability

Core gameplay should not require active administration during the wedding.

### NFR-006: Maintainability

Shared application concerns should be separated from individual game implementations where practical.

The system should remain understandable and maintainable by a single developer.

### NFR-007: Appropriate Scale

The architecture should support the expected wedding guest population without introducing unnecessary distributed-system complexity.

### NFR-008: Testability

Core game logic, scoring, validation, and important user flows should be structured so they can be tested automatically.

### NFR-009: Documentation

Major architectural decisions, requirements, development setup, and operational processes should be documented in the repository.

### NFR-010: Privacy

Private wedding information and unpublished production puzzle answers should not be exposed unnecessarily in the public repository.

## Current Product Guardrails

* Games are intended primarily as a pre-wedding experience.
* Games should not be designed to encourage phone use during the dinner or reception.
* Cocktail-hour gameplay may be explored later if it encourages social interaction rather than replacing it.
* The project should use production-oriented engineering practices without adding technology solely for portfolio complexity.
* Requirements and architectural decisions may be revised as the project evolves.

## Out of Scope for Initial Development

The following are not required for the initial version:

* Traditional username/password authentication
* Native iOS or Android applications
* Wedding guest list integration
* Table-based competition
* Reception gameplay
* Administrative puzzle editor
* Real-time multiplayer gameplay
* Real-time WebSocket infrastructure
* Offline-first support
* Advanced analytics
* Large-scale distributed infrastructure
