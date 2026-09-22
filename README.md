# Full-Stack Calculator

A small calculator web app. The React frontend never does any math itself; every operation is sent to a Go backend over a tiny REST API. The whole thing ships as a single Docker image.

Supported operations: add, subtract, multiply, divide, power, square root, percent.

## Project layout

```
frontend/   Vite + React 19 + TypeScript
backend/    Go, standard library only
```

The frontend logic lives in three files: `api.ts` (fetch client), `useCalculator.ts` (state), `Calculator.tsx` (UI). The backend separates pure math (`calculator.go`) from HTTP handling (`handler.go`).

## Setup

You need Go 1.22+ and Node 22+. Docker is optional.

The backend has no dependencies, so there is nothing to install for it. For the frontend:

```bash
cd frontend && npm install
```

## Running it

Two terminals for development:

```bash
make dev-backend    # Go API on :8080
```

```bash
make dev-frontend   # Vite on :5173, proxies /api to the backend
```

Then open http://localhost:5173.

Or run everything in one container:

```bash
make docker-build
```

```bash
make docker-run
```

and open http://localhost:8080. The Go binary serves both the built frontend and the API. The image comes out around 22 MB.

The server reads two env vars: `PORT` (default 8080) and `STATIC_DIR` (where to serve frontend files from; only set inside the Docker image).

## API

There is one real endpoint, `POST /api/v1/calculate`, plus `GET /healthz` for a liveness check.

```bash
curl -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","operands":[2,3]}'
# {"result":5}
```

`sqrt` and `percent` take one operand, everything else takes two. `percent` simply divides by 100.

Calculation errors come back as JSON with a machine-readable code, which is what the frontend uses to pick a friendly message:

```bash
curl -X POST localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","operands":[1,0]}'
# {"error":{"code":"DIVISION_BY_ZERO","message":"division by zero is undefined"}}
```

Bad requests (unknown operation, wrong operand count, invalid JSON) get a 400. Requests that are valid but mathematically undefined (divide by zero, square root of a negative, overflow) get a 422.

## Design notes

- All math happens on the backend; that is the point of the exercise. The frontend only edits the input string and renders what the API returns.
- The Go server uses only the standard library. No frameworks, nothing to keep updated, and the final image stays tiny.
- The API is strict on purpose: request bodies are capped at 4 KB, unknown JSON fields are rejected, and operands must be finite numbers.
- It behaves like a desk calculator: pressing an operator evaluates the pending operation first, so there is no operator precedence.
- Results are shown with 12 significant digits to hide floating-point noise. Regular float64 precision is assumed to be fine for a calculator.
- Slow responses can't corrupt state: each request gets an id, stale responses are dropped, and every call times out after 10 seconds.
- Dev and prod both serve the frontend and API from one origin (Vite proxy in dev, the Go binary in prod), so CORS never comes up.
- The tape below the keypad keeps the last three calculations only, and history is not persisted anywhere.

## Tests

```bash
make test
```

```bash
make coverage
```
