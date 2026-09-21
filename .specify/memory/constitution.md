# Sezzle Calculator Constitution

## Core Principles

### I. Simplicity First
Code MUST be readable in one sitting: flat file layouts, few files, no speculative
abstractions or extra layers. The backend is a single Go package with zero external
dependencies; the frontend is a flat `src/` with one custom hook. New indirection
(interfaces, folders, libraries) requires a concrete, present need — YAGNI is enforced.

### II. Self-Documenting Code
Source files contain no comments. Names, types, and structure MUST carry the meaning.
All identifiers, strings, commit messages, and documentation are written in English.

### III. Server-Side Arithmetic (NON-NEGOTIABLE)
Every arithmetic result shown to the user MUST come from the backend API. The frontend
performs input editing only (digits, decimal point, clearing); it never computes.

### IV. Explicit Contract
The API has one calculation endpoint with a fixed JSON shape and a machine-readable
error envelope (`{"error":{"code","message"}}`). Invalid requests return 400;
mathematically undefined operations return 422. Every error code is documented and
covered by a test.

### V. Test Rigor
Domain logic targets ~100% coverage with table-driven tests mirroring the documented
edge-case matrix. Every operation, every button, and every user flow is verified:
unit tests on both layers, component tests for each keypad interaction, and end-to-end
checks against the running stack, including the Docker image.

## Technology Constraints

Backend: Go standard library only (Go 1.22+ `ServeMux`). Frontend: Vite + React +
TypeScript strict, plain CSS with custom properties, no runtime dependencies beyond
React. No environment configuration beyond `PORT` and `STATIC_DIR`. Deployment: one
multi-stage Dockerfile serving frontend and API from a single container.

## Development Workflow

Spec Kit drives the process: constitution → specify → plan → tasks → implement, each
phase committed atomically. CI runs `go vet`, `go test -race`, frontend tests, and the
production build on every push. AI prompts used during development are recorded in
`PROMPTS.md`.

## Governance

This constitution supersedes ad-hoc practice for this repository. Amendments are made
by editing this file with a semantic version bump and rationale in the commit message.
Every change set is reviewed against Principles I–V before commit; complexity that
violates Principle I must be justified in `README.md` design decisions or removed.

**Version**: 1.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
