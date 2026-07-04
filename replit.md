# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `cd artifacts/api-server-java; .\run.ps1` — run the Spring Boot API server (port 5000)
- `pnpm --filter @workspace/shopping-ai run dev` — run the React frontend (port 5173)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env in `.env`: `GEMINI_API_KEY` — Google Gemini AI API key

## Stack

- Backend: Java 17/25, Spring Boot 3.4.1 (with Spring Data JPA & Security)
- Frontend: React + TypeScript (Vite)
- DB: MySQL (via Spring Boot Data Source config / Drizzle for migrations)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
