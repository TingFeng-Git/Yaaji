import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000
})

export const bookmarkApi = {
  getAll: () => api.get('/bookmarks'),
  getById: (id) => api.get(`/bookmarks/${id}`),
  getRecent: (limit = 5) => api.get('/bookmarks/recent', { params: { limit } }),
  checkUrl: (url) => api.get('/bookmarks/check-url', { params: { url } }),
  create: (bookmark) => api.post('/bookmarks', bookmark),
  update: (id, bookmark) => api.put(`/bookmarks/${id}`, bookmark),
  recordClick: (id) => api.post(`/bookmarks/${id}/click`),
  delete: (id) => api.delete(`/bookmarks/${id}`),
  deleteBatch: (ids) => api.post('/bookmarks/batch-delete', ids),
  importBookmarks: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/bookmarks/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    })
  },
  getImportProgress: (taskId) => api.get('/bookmarks/import/progress', { params: { taskId } }),
  exportBookmarks: () => api.get('/bookmarks/export', { responseType: 'blob' })
}

export const categoryApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (category) => api.post('/categories', category),
  update: (id, category) => api.put(`/categories/${id}`, category),
  delete: (id) => api.delete(`/categories/${id}`),
  deleteBatch: (ids) => api.post('/categories/batch-delete', ids),
  deleteEmpty: () => api.delete('/categories/empty')
}

export const urlApi = {
  getTitle: (url) => api.get('/url/title', { params: { url } })
}