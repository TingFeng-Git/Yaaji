# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

雅集 (Yaji) — a bookmark management tool built on Cloudflare's edge platform. Three-module monorepo managed with npm workspaces:

- **bookmarks-workers/** — Cloudflare Workers backend (TypeScript, Hono, D1)
- **frontend/** — Vue 3 SPA (Vite, Axios, Vue Router)
- **chrome-extension/** — Chrome Extension (Manifest V3, Vue 3)

## Architecture

### Backend (Cloudflare Workers)

- **Entry**: `bookmarks-workers/src/worker.ts` (deployment), `bookmarks-workers/src/index.ts` (testing)
- **Framework**: Hono — lightweight, edge-optimized
- **Database**: Cloudflare D1 (SQLite at edge), schema in `schema.sql`
- **Async tasks**: Durable Objects (`ImportTaskDO` in `services/async.ts`)
- **Auth**: JWT (HS256) via `hono/jwt`, middleware in `middleware/auth.ts`
- **Route-service pattern**: Routes in `src/routes/`, business logic in `src/services/`
- **API prefix**: All routes under `/api` (`/api/bookmarks`, `/api/categories`, `/api/url`)
- **Column convention**: snake_case in D1, camelCase in API responses
- **Edge caching**: GET responses cached (60s bookmarks, 300s categories)

### Frontend (Vue 3)

- **State management**: Simple reactive store (`store/sharedState.js`, `store/auth.js`) — no Vuex/Pinia
- **Auth persistence**: `yaji_auth_token` and `yaji_auth_user` in localStorage
- **Dev proxy**: `/api` → `http://localhost:8787` (configurable via `VITE_API_TARGET`)
- **SPA routing**: `public/_redirects` for Cloudflare Pages
- **Build**: Manual chunks (vue-vendor, http-vendor), content-hashed filenames

### Chrome Extension

- Manifest V3, multi-entry Vite build (popup, options, background service worker)
- Uses `chrome.storage.local` — separate local store, not connected to Workers API yet

## Commands

### Root

```bash
npm run dev:workers          # Workers dev server (port 8787)
npm run dev:frontend         # Frontend dev server (port 3000)
npm run build                # Build all workspaces
npm run deploy               # Deploy Workers to Cloudflare
npm run deploy:frontend      # Deploy frontend to Cloudflare Pages
npm run db:setup             # Initialize D1 schema
npm run db:reset             # Reset D1 database
```

### Workers (`cd bookmarks-workers`)

```bash
npm run dev                  # Local dev server
npm run deploy               # Deploy to Cloudflare
npm run deploy:prod          # Deploy to production
npm run typecheck            # tsc --noEmit
npm run test                 # vitest run
npm run tail                 # Real-time logs
npm run db:create            # Create D1 database
npm run db:setup             # Initialize schema
npm run db:migrate           # Apply schema
npm run db:query "SQL"       # Execute SQL query
```

### Frontend (`cd frontend`)

```bash
npm run dev                  # Vite dev server (port 3000)
npm run build                # Production build
npm run test                 # vitest run
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
```

## Key Pitfalls

1. **Route ordering**: Static routes (`/recent`, `/check-url`) must be defined before parameterized routes (`/:id`) in Hono
2. **Foreign keys**: SQLite doesn't enforce foreign keys by default — must run `PRAGMA foreign_keys = ON`
3. **D1 binding required**: Workers won't start without D1 database binding in `wrangler.toml`
4. **Durable Objects**: Required for async import, must be configured in `wrangler.toml`
5. **Duplicate routes**: `bookmarks.ts` has duplicate route definitions (lines 32-321 and 323-595) — the first set uses `userId` from auth context, the second does not. This is a known issue.

## Environment Variables

Required: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`
Optional: `ENVIRONMENT` (default: `development`), `CORS_ORIGIN` (default: `http://localhost:3000`), `JWT_SECRET`
