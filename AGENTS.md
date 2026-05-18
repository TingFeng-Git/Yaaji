# Bookmarks Project - Agent Guide

## Project Overview

雅集 (Yaji) - 优雅的书签管理工具。Three-module monorepo:

- **bookmarks-workers/** - Cloudflare Workers + TypeScript + Hono
- **frontend/** - Vue 3 + Vite + Axios + Vue Router
- **chrome-extension/** - Chrome Extension (Manifest V3) + Vue 3 + Vite

## Critical Architecture Facts

### Backend (Cloudflare Workers)

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono (lightweight, edge-optimized)
- **Database**: Cloudflare D1 (SQLite at edge)
- **Durable Objects**: Used for async import tasks
- **Port**: 8787 (local dev)
- **API Prefix**: `/api/bookmarks`, `/api/categories`, `/api/url`

### Frontend (Vue 3)

- **Dev server**: port 3000, proxies `/api` to `http://localhost:8787`
- **State management**: Simple reactive store (`sharedState.js`), no Vuex/Pinia
- **API service**: `services/api.js` - axios instance with env-based baseURL
- **Routing**: Vue Router with 4 routes: `/`, `/add`, `/edit/:id`, `/categories`
- **Deployment**: Cloudflare Pages

### Chrome Extension

- **Name**: 雅集 - 书签管理
- **Permissions**: storage, bookmarks, activeTab, tabs, contextMenus
- **Keyboard shortcut**: Ctrl+Shift+B (Cmd+Shift+B on Mac)
- **Build**: Multi-entry Vite build (popup, options, background, manifest)

## Developer Commands

### Root Directory

```bash
npm run dev                  # Start all services
npm run dev:workers          # Start Workers only
npm run dev:frontend         # Start frontend only
npm run dev:extension        # Start Chrome extension only
npm run build                # Build all
npm run deploy               # Deploy Workers
npm run deploy:frontend      # Deploy frontend to Pages
npm run db:setup             # Initialize database
npm run db:reset             # Reset database
```

### Workers

```bash
cd bookmarks-workers
npm run dev                  # Local dev server (port 8787)
npm run build                # TypeScript build
npm run deploy               # Deploy to Cloudflare
npm run deploy:prod          # Deploy to production
npm run db:create            # Create D1 database
npm run db:setup             # Initialize schema
npm run db:migrate           # Apply schema
npm run db:query "SQL"       # Execute SQL query
npm run tail                 # View real-time logs
npm run typecheck            # TypeScript type check
```

### Frontend

```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start dev server on port 3000
npm run build                # Build for production
npm run preview              # Preview production build
npm test                     # Run tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
```

### Chrome Extension

```bash
cd chrome-extension
npm install                  # Install dependencies
npm run dev                  # Start dev mode
npm run build                # Build extension to dist/
```

## API Endpoints

### Bookmarks (`/api/bookmarks`)

- `GET /` - List all bookmarks (optional: `?categoryId=`)
- `GET /recent` - Get recently clicked bookmarks (optional: `?limit=`)
- `GET /check-url` - Check if URL exists (`?url=`)
- `GET /:id` - Get bookmark by ID
- `POST /` - Create bookmark
- `PUT /:id` - Update bookmark
- `DELETE /:id` - Delete bookmark
- `POST /:id/click` - Record click (increments clickCount)
- `POST /batch-delete` - Delete multiple bookmarks (body: array of IDs)
- `POST /import` - Import bookmarks from HTML file
- `GET /import/progress` - Check import progress (`?taskId=`)
- `GET /export` - Export all bookmarks as HTML
- `POST /export` - Export selected bookmarks (body: `{ ids: [...] }`)

### Categories (`/api/categories`)

- `GET /` - List all categories
- `GET /:id` - Get category by ID
- `POST /` - Create category
- `PUT /:id` - Update category
- `DELETE /:id` - Delete category
- `POST /batch-delete` - Delete multiple categories (body: array of IDs)
- `DELETE /empty` - Delete empty categories

### URL Title (`/api/url/title`)

- `GET /?url=` - Fetch page title from URL

## Data Model

### Bookmark Entity

- `id` (INTEGER, auto-increment)
- `title` (TEXT, required)
- `url` (TEXT, required, unique)
- `description` (TEXT, optional)
- `categoryId` (INTEGER, foreign key)
- `clickCount` (INTEGER, default 0)
- `createdAt` (TEXT, ISO 8601)
- `updatedAt` (TEXT, ISO 8601)
- `lastClickedAt` (TEXT, ISO 8601, nullable)

### Category Entity

- `id` (INTEGER, auto-increment)
- `name` (TEXT, required)
- `color` (TEXT, default '#667eea')
- `createdAt` (TEXT, ISO 8601)

## Key Implementation Details

### D1 Database

- SQLite at Cloudflare edge
- Foreign keys enabled via `PRAGMA foreign_keys = ON`
- `ON DELETE SET NULL` for category deletion
- snake_case columns, camelCase in API responses

### Bookmark Import

- Parses Netscape Bookmark File format (HTML exported from browsers)
- Uses regex for HTML parsing (no external dependencies)
- Async processing with Durable Objects
- Progress tracking via task ID
- Auto-creates categories during import

### Bookmark Export

- Generates standard Netscape Bookmark File format
- Groups bookmarks by category
- Includes click count and last clicked timestamp
- HTML entity escaping for special characters

### Frontend Configuration

- Dev proxy: `/api` → `http://localhost:8787`
- Production: `VITE_API_URL` environment variable
- SPA routing: `public/_redirects` for Cloudflare Pages

## Common Pitfalls

1. **D1 required**: Workers won't start without D1 database binding
2. **Route ordering**: Static routes (`/recent`, `/check-url`) must be before parameterized routes (`/:id`)
3. **Foreign keys**: SQLite doesn't enforce foreign keys by default, must enable with PRAGMA
4. **No authentication**: API is completely open - no auth implemented
5. **CORS**: Configured in Workers, allows `http://localhost:3000` in dev
6. **Durable Objects**: Required for async import, must be configured in wrangler.toml

## File Structure

```
bookmarks/
├── bookmarks-workers/
│   ├── src/
│   │   ├── index.ts           # Entry point (for testing)
│   │   ├── worker.ts          # Worker entry (for deployment)
│   │   ├── routes/
│   │   │   ├── bookmarks.ts   # Bookmark API routes
│   │   │   ├── categories.ts  # Category API routes
│   │   │   └── url.ts         # URL title fetch
│   │   ├── services/
│   │   │   ├── import.ts      # Import logic
│   │   │   ├── export.ts      # Export logic
│   │   │   └── async.ts       # Durable Object for async tasks
│   │   ├── middleware/
│   │   └── types.ts           # TypeScript types
│   ├── schema.sql             # D1 database schema
│   ├── wrangler.toml          # Wrangler configuration
│   ├── vitest.config.ts       # Test configuration
│   ├── tests/                 # Test files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/
│   │   ├── services/api.js
│   │   ├── store/sharedState.js
│   │   ├── views/
│   │   └── components/
│   ├── public/
│   │   └── _redirects         # SPA routing for Pages
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── tests/
│   └── package.json
├── chrome-extension/
│   ├── src/
│   ├── public/
│   └── package.json
├── scripts/                   # Migration scripts
├── docs/                      # Documentation
├── package.json               # Root monorepo config
├── .env.example               # Environment variables
└── README.md
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `D1_DATABASE_ID` | D1 database ID |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Runtime environment | `development` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `VITE_API_URL` | Frontend API base URL | `/api` |
