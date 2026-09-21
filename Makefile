.PHONY: dev-backend dev-frontend test coverage build docker-build docker-run

dev-backend:
	cd backend && go run .

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && go test -race ./...
	cd frontend && npm test -- --run

coverage:
	cd backend && go test -race -coverprofile=coverage.out ./... && go tool cover -func=coverage.out && go tool cover -html=coverage.out -o coverage.html
	cd frontend && npm run coverage

build:
	cd frontend && npm ci && npm run build
	cd backend && go build -o bin/server .

docker-build:
	docker build -t sezzle-calculator .

docker-run:
	docker run --rm -p 8080:8080 sezzle-calculator
