# Bookmarks Project - Agent Guide

## Project Overview

雅集 (Yaji) - 优雅的书签管理工具。Three-module monorepo:

- **backend/** - Spring Boot 3.2.0 + Java 17 + Maven + MySQL + JPA
- **frontend/** - Vue 3 + Vite + Axios + Vue Router
- **chrome-extension/** - Chrome Extension (Manifest V3) + Vue 3 + Vite

## Critical Architecture Facts

### Backend (Spring Boot)

- **Base package**: `com.bookmarks`
- **Context path**: `/api` (all endpoints prefixed with `/api`)
- **Port**: 8080
- **Database**: MySQL `bookmarks` database, root/zh1234 (dev only)
- **JPA ddl-auto**: `update` (auto-creates/updates tables)
- **Async enabled**: `@EnableAsync` for import operations
- **Entity pattern**: JPA entities in `entity/`, no DTOs - entities exposed directly in API
- **Exception handling**: `GlobalExceptionHandler` catches `RuntimeException` (400) and `Exception` (500)

### Frontend (Vue 3)

- **Dev server**: port 3000, proxies `/api` to `http://172.21.201.229:8080`
- **State management**: Simple reactive store (`sharedState.js`), no Vuex/Pinia
- **API service**: `services/api.js` - axios instance with hardcoded baseURL
- **Routing**: Vue Router with 4 routes: `/`, `/add`, `/edit/:id`, `/categories`

### Chrome Extension

- **Name**: 雅集 - 书签管理
- **Permissions**: storage, bookmarks, activeTab, tabs, contextMenus
- **Keyboard shortcut**: Ctrl+Shift+B (Cmd+Shift+B on Mac)
- **Build**: Multi-entry Vite build (popup, options, background, manifest)

## Developer Commands

### Backend

```bash
cd backend
mvn spring-boot:run          # Start dev server (requires MySQL on localhost:3306)
mvn test                     # Run tests
mvn package                  # Build JAR
```

### Frontend

```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start dev server on port 3000
npm run build                # Build for production
npm run preview              # Preview production build
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

- `GET /` - List all bookmarks
- `GET /{id}` - Get bookmark by ID
- `GET /check-url?url=` - Check if URL exists
- `POST /` - Create bookmark
- `PUT /{id}` - Update bookmark
- `POST /{id}/click` - Record click timestamp
- `DELETE /{id}` - Delete bookmark
- `POST /batch-delete` - Delete multiple bookmarks (body: array of IDs)
- `POST /import` - Import bookmarks from HTML file (async, returns taskId)
- `GET /import/progress?taskId=` - Check import progress
- `GET /export` - Export bookmarks as HTML

### Categories (`/api/categories`)

- `GET /` - List all categories
- `GET /{id}` - Get category by ID
- `POST /` - Create category
- `PUT /{id}` - Update category
- `DELETE /{id}` - Delete category
- `POST /batch-delete` - Delete multiple categories
- `DELETE /empty` - Delete empty categories

### URL Title (`/api/url/title`)

- `GET /?url=` - Fetch page title from URL

## Data Model

### Bookmark Entity

- `id` (Long, auto-generated)
- `title` (String, max 500)
- `url` (String, max 2000, unique)
- `description` (String, max 500)
- `categoryId` (Long, foreign key to categories)
- `createdAt`, `updatedAt` (auto-managed via @PrePersist/@PreUpdate)
- `lastClickedAt` (updated on click recording)

### Category Entity

- `id` (Long, auto-generated)
- `name` (String, required)
- `color` (String, hex color, defaults to #667eea)
- `createdAt` (auto-managed)

## Key Implementation Details

### Bookmark Import

- Parses Netscape Bookmark File format (HTML exported from browsers)
- Uses Jsoup for HTML parsing
- Async processing with progress tracking via `ImportProgressService`
- Creates categories on-the-fly during import
- Max recursion depth: 10 levels

### Frontend Proxy Configuration

The Vite dev server proxies `/api` requests to `http://172.21.201.229:8080`. This IP is hardcoded in `vite.config.js` - update it for your environment.

### Chrome Extension Architecture

- **popup/** - Main popup UI (add/manage bookmarks)
- **options/** - Settings page
- **background/** - Service worker for context menus and messaging
- **shared/** - Shared utilities
- Uses Chrome Storage API for local state
- Context menu integration for quick bookmark addition

## Common Pitfalls

1. **MySQL required**: Backend won't start without MySQL running on localhost:3306
2. **Hardcoded proxy IP**: Frontend proxies to `172.21.201.229:8080` - change in `vite.config.js` for your setup
3. **No authentication**: API is completely open - no auth implemented
4. **No CORS config in backend**: Only `@CrossOrigin(origins = "http://localhost:3000")` on controllers
5. **JPA ddl-auto: update**: Schema changes auto-applied, no migration tool
6. **No TypeScript**: Both frontend and extension use plain JavaScript
7. **No linting/formatting config**: No ESLint, Prettier, or Checkstyle configured

## File Structure

```
bookmarks/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/bookmarks/
│       ├── BookmarksApplication.java    # Entry point
│       ├── controller/                  # REST controllers
│       ├── entity/                      # JPA entities
│       ├── exception/                   # Global exception handler
│       ├── repository/                  # Spring Data repositories
│       └── service/                     # Business logic
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js                      # Entry point
│       ├── App.vue                      # Root component
│       ├── router/                      # Vue Router config
│       ├── services/api.js              # API client
│       ├── store/sharedState.js         # Simple state management
│       ├── views/                       # Page components
│       └── components/                  # Reusable components
├── chrome-extension/
│   ├── package.json
│   ├── vite.config.js
│   ├── public/manifest.json             # Extension manifest
│   ├── background/service-worker.js     # Background script
│   ├── popup/                           # Popup UI
│   ├── options/                         # Options page
│   └── shared/                          # Shared utilities
└── docs/                                # Sample bookmark exports
```
