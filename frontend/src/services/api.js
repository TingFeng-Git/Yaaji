import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000
})

export const bookmarkApi = {
  getAll: () => api.get('/api/bookmarks'),
  getById: (id) => api.get(`/api/bookmarks/${id}`),
  getRecent: (limit = 5) => api.get('/api/bookmarks/recent', { params: { limit } }),
  checkUrl: (url) => api.get('/api/bookmarks/check-url', { params: { url } }),
  create: (bookmark) => api.post('/api/bookmarks', bookmark),
  update: (id, bookmark) => api.put(`/api/bookmarks/${id}`, bookmark),
  recordClick: (id) => api.post(`/api/bookmarks/${id}/click`),
  delete: (id) => api.delete(`/api/bookmarks/${id}`),
  deleteBatch: (ids) => api.post('/api/bookmarks/batch-delete', ids),
  importBookmarks: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/bookmarks/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    })
  },
  getImportProgress: (taskId) => api.get('/api/bookmarks/import/progress', { params: { taskId } }),
  exportBookmarks: () => api.get('/api/bookmarks/export', { responseType: 'blob' })
}

export const categoryApi = {
  getAll: () => api.get('/api/categories'),
  getById: (id) => api.get(`/api/categories/${id}`),
  create: (category) => api.post('/api/categories', category),
  update: (id, category) => api.put(`/api/categories/${id}`, category),
  delete: (id) => api.delete(`/api/categories/${id}`),
  deleteBatch: (ids) => api.post('/api/categories/batch-delete', ids),
  deleteEmpty: () => api.delete('/api/categories/empty')
}

export const urlApi = {
  getTitle: (url) => api.get('/api/url/title', { params: { url } })
}