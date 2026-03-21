import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000
})

export const bookmarkApi = {
  getAll: () => api.get('/bookmarks'),
  getById: (id) => api.get(`/bookmarks/${id}`),
  create: (bookmark) => api.post('/bookmarks', bookmark),
  update: (id, bookmark) => api.put(`/bookmarks/${id}`, bookmark),
  delete: (id) => api.delete(`/bookmarks/${id}`)
}

export const categoryApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (category) => api.post('/categories', category),
  update: (id, category) => api.put(`/categories/${id}`, category),
  delete: (id) => api.delete(`/categories/${id}`)
}

export const urlApi = {
  getTitle: (url) => api.get('/url/title', { params: { url } })
}