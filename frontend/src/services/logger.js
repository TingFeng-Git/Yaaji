const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

export const logger = {
  error: (...args) => {
    if (isDev) {
      console.error(...args)
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args)
    }
  },
}
