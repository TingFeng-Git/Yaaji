import { vi } from 'vitest'

global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

const originalCreateElement = document.createElement.bind(document)
document.createElement = (tag) => {
  const el = originalCreateElement(tag)
  if (tag === 'a') {
    el.click = vi.fn()
  }
  return el
}

export const createMockResponse = (data) => data

export const createMockError = (message, status = 500) => {
  const error = new Error(message)
  error.response = {
    data: { message },
    status,
    statusText: 'Internal Server Error'
  }
  return error
}

export const mockBookmarks = [
  {
    id: 1,
    title: 'Test Bookmark 1',
    url: 'https://example.com/1',
    description: 'Description 1',
    categoryId: 1,
    createdAt: '2024-01-15T10:30:00',
    updatedAt: '2024-01-15T10:30:00',
    lastClickedAt: '2024-01-20T15:45:00',
    clickCount: 5
  },
  {
    id: 2,
    title: 'Test Bookmark 2',
    url: 'https://example.com/2',
    description: 'Description 2',
    categoryId: 2,
    createdAt: '2024-01-16T11:00:00',
    updatedAt: '2024-01-16T11:00:00',
    lastClickedAt: null,
    clickCount: 0
  },
  {
    id: 3,
    title: 'Another Site',
    url: 'https://another.com',
    description: '',
    categoryId: null,
    createdAt: '2024-01-17T09:00:00',
    updatedAt: '2024-01-17T09:00:00',
    lastClickedAt: '2024-01-18T14:30:00',
    clickCount: 2
  }
]

export const mockCategories = [
  { id: 1, name: '开发工具', color: '#667eea', createdAt: '2024-01-15T10:00:00' },
  { id: 2, name: '设计资源', color: '#f5576c', createdAt: '2024-01-15T10:00:00' },
  { id: 3, name: '学习资料', color: '#43e97b', createdAt: '2024-01-16T10:00:00' }
]
