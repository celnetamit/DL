# ──────────────────────────────────────────────────────────────────────────────
#  Aether LMS – Developer Makefile
#  Requires: go, npm, python3 + uvicorn already available in PATH
# ──────────────────────────────────────────────────────────────────────────────

.PHONY: dev test build clean

## Start all three services concurrently (requires GNU make 4.x)
dev:
	@echo "▶ Starting AI Engine (port 8000)..."
	@cd ai-engine-py && source .venv/bin/activate && uvicorn main:app --reload --port 8000 &
	@echo "▶ Starting Go Backend (port 8080)..."
	@cd backend-go && set -a && source .env && set +a && go run main.go &
	@echo "▶ Starting Next.js Frontend (port 3000)..."
	@cd frontend && npm run dev -- --port 3000

## Run Go unit tests
test:
	@echo "▶ Running Go unit tests..."
	@cd backend-go && go test ./... -v -count=1

## Run Go tests with race detector
test-race:
	@cd backend-go && go test ./... -race -v

## Build Next.js for production
build:
	@echo "▶ Building Next.js..."
	@cd frontend && npm run build

## Tidy Go modules
tidy:
	@cd backend-go && go mod tidy

## Remove build artefacts
clean:
	@cd backend-go && rm -f lms-backend
	@cd frontend && rm -rf .next out

## Show available commands
help:
	@grep -E '^## ' Makefile | sed 's/## //'
