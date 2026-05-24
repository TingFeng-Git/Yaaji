<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-icon">🔐</span>
        <h1>雅集</h1>
        <p class="auth-subtitle">优雅的书签管理工具</p>
      </div>

      <div class="auth-tabs">
        <button
          :class="['auth-tab', { active: mode === 'login' }]"
          @click="mode = 'login'"
        >登录</button>
        <button
          :class="['auth-tab', { active: mode === 'register' }]"
          @click="mode = 'register'"
        >注册</button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
        </button>
      </form>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../services/api'

export default {
  name: 'AuthPage',
  setup() {
    const router = useRouter()
    const mode = ref('login')
    const username = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const successMessage = ref('')

    const handleSubmit = async () => {
      error.value = ''
      successMessage.value = ''
      loading.value = true

      try {
        if (mode.value === 'login') {
          await authApi.login(username.value, password.value)
          successMessage.value = '登录成功，正在跳转...'
          setTimeout(() => router.push('/'), 500)
        } else {
          await authApi.register(username.value, password.value)
          successMessage.value = '注册成功，已自动登录'
          setTimeout(() => router.push('/'), 500)
        }
      } catch (err) {
        error.value = err.message
      } finally {
        loading.value = false
      }
    }

    return {
      mode,
      username,
      password,
      loading,
      error,
      successMessage,
      handleSubmit,
    }
  },
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 1rem;
}

.auth-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.5rem;
}

.auth-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: var(--font-serif);
  color: var(--color-ink);
  margin-bottom: 0.25rem;
}

.auth-subtitle {
  color: var(--color-ink-muted);
  font-size: 0.875rem;
}

.auth-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border-light);
}

.auth-tab {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition: all var(--transition);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-family: var(--font-sans);
}

.auth-tab:hover {
  color: var(--color-ink-secondary);
}

.auth-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink-secondary);
  font-family: var(--font-sans);
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all var(--transition);
  background: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-border);
  box-shadow: 0 0 0 3px rgba(28,28,30,0.05);
}

.form-group input::placeholder {
  color: var(--color-ink-muted);
}

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  text-align: center;
}

.submit-btn {
  margin-top: 0.5rem;
  padding: 0.875rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-sans);
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  margin-top: 1rem;
  background: var(--color-success-bg);
  color: var(--color-success-text);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  text-align: center;
}
</style>
