export interface Bookmark {
  id: number
  title: string
  url: string
  description: string
  categoryId: number
  userId: number
  createdAt: string
  updatedAt: string
  lastClickedAt: string | null
  clickCount: number
}

export interface Category {
  id: number
  name: string
  color: string
  userId: number
  createdAt: string
}

export interface User {
  id: number
  username: string
  createdAt: string
}

export interface Env {
  ENVIRONMENT: string
  CORS_ORIGIN: string
  DB: D1Database
  IMPORT_TASKS: DurableObjectNamespace
}

export interface AuthContext {
  userId: number
  username: string
}
