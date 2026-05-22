import { loadAuthFromStorage, setAuth, clearAuth } from '../store/auth'

// 初始化：从 localStorage 加载 token
loadAuthFromStorage()

const API_BASE = import.meta.env.VITE_API_URL || ''

function getHeaders(includeAuth = false) {
  const headers = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const token = localStorage.getItem('yaji_auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

async function handleResponse(response) {
  // 204 No Content 没有 body，直接返回 null
  if (response.status === 204) {
    return null
  }
  const text = await response.text()
  if (!text) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return null
  }
  const data = JSON.parse(text)
  if (!response.ok) {
    const error = data.error || data.message || '请求失败'
    throw new Error(error)
  }
  return data
}

export const authApi = {
  async register(username, password) {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    })
    const data = await handleResponse(response)
    setAuth(data.token, data.user)
    return data
  },

  async login(username, password) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    })
    const data = await handleResponse(response)
    setAuth(data.token, data.user)
    return data
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getHeaders(true),
      })
    } catch {
      // 忽略网络错误，本地清除 token
    }
    clearAuth()
  },

  async getMe() {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders(true),
    })
    return handleResponse(response)
  },
}

export const bookmarkApi = {
  getAll(categoryId = null) {
    let url = `${API_BASE}/api/bookmarks`
    const params = []
    if (categoryId) params.push(`categoryId=${categoryId}`)
    params.push(`_t=${Date.now()}`)
    return fetch(`${url}?${params.join('&')}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  getById(id) {
    return fetch(`${API_BASE}/api/bookmarks/${id}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  create(data) {
    return fetch(`${API_BASE}/api/bookmarks`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }).then(handleResponse)
  },

  update(id, data) {
    return fetch(`${API_BASE}/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }).then(handleResponse)
  },

  delete(id) {
    return fetch(`${API_BASE}/api/bookmarks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  batchDelete(ids) {
    return fetch(`${API_BASE}/api/bookmarks/batch-delete`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(ids),
    }).then(handleResponse)
  },

  click(id) {
    return fetch(`${API_BASE}/api/bookmarks/${id}/click`, {
      method: 'POST',
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  import(file) {
    const formData = new FormData()
    formData.append('file', file)
    return fetch(`${API_BASE}/api/bookmarks/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('yaji_auth_token')}` },
      body: formData,
    }).then(handleResponse)
  },

  getProgress(taskId) {
    return fetch(`${API_BASE}/api/bookmarks/import/progress?taskId=${taskId}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  export(selectedIds = null) {
    const opts = { headers: getHeaders(true) }
    if (selectedIds) {
      opts.method = 'POST'
      opts.body = JSON.stringify({ ids: selectedIds })
    }
    return fetch(`${API_BASE}/api/bookmarks/export`, opts).then(async (response) => {
      if (!response.ok) throw new Error('导出失败')
      return response.blob()
    })
  },

  checkUrl(url) {
    return fetch(`${API_BASE}/api/bookmarks/check-url?url=${encodeURIComponent(url)}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  getRecent(limit = 3) {
    return fetch(`${API_BASE}/api/bookmarks/recent?limit=${limit}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },
}

export const categoryApi = {
  getAll() {
    return fetch(`${API_BASE}/api/categories`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  getById(id) {
    return fetch(`${API_BASE}/api/categories/${id}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  create(data) {
    return fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }).then(handleResponse)
  },

  update(id, data) {
    return fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }).then(handleResponse)
  },

  delete(id) {
    return fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }).then(handleResponse)
  },

  batchDelete(ids) {
    return fetch(`${API_BASE}/api/categories/batch-delete`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(ids),
    }).then(handleResponse)
  },

  deleteEmpty() {
    return fetch(`${API_BASE}/api/categories/empty`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }).then(handleResponse)
  },
}

export const urlApi = {
  getTitle(url) {
    return fetch(`${API_BASE}/api/url/title?url=${encodeURIComponent(url)}`, {
      headers: getHeaders(true),
    }).then(handleResponse)
  },
}
