# Full-Stack Calculator

A calculator web app whose arithmetic is performed exclusively by a backend microservice. React + TypeScript frontend, zero-dependency Go REST API, one Docker image for the whole stack.

- Seven operations: add, subtract, multiply, divide, power, square root, percent
- Every result comes from the API; the frontend only edits input text
- Structured JSON error contract with machine-readable codes
- Keyboard support, dark mode, responsive down to 375px
- A terminal-style tape below the keypad logs the last three calculations
- 133 tests across both layers (unit, HTTP contract, hook, per-button component)

## Architecture

```
frontend/  Vite + React 19 + TypeScript (strict)   backend/  Go, standard library only
  src/api.ts          fetch client                   calculator.go  pure domain logic
  src/useCalculator.ts state + orchestration         handler.go     HTTP + validation
  src/Calculator.tsx   display + keypad              main.go        routes + config
```

In development, Vite proxies `/api` to the Go server, so there is one origin and no CORS. In the Docker image, the Go binary serves the built frontend and the API from the same port.

## Prerequisites

- Go 1.22+ (developed with 1.27)
- Node 22+ and npm (developed with Node 24 / npm 11)
- Docker (optional, only for the container build; colima works)

## Run

Development (two terminals):

```bash
make dev-backend
```

```bash
make dev-frontend
```

Open http://localhost:5173. The frontend needs `npm install` in `frontend/` on first run.

Docker (single container, verified image size ~22 MB):

```bash
make docker-build
```

```bash
make docker-run
```

Open http://localhost:8080.

## Tests and coverage

```bash
make test
```

```bash
make coverage
```


