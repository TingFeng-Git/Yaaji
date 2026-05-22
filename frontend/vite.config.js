import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8787',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: false,
      // Inline assets smaller than 4KB as base64
      assetsInlineLimit: 4096,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Report compressed sizes for optimization insight
      reportCompressedSize: true,
      // Warn if chunk exceeds 600KB
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Content-hashed filenames for long-term caching
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
          }
        }
      }
    },
    // Expose version at build time
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.0.0')
    }
  }
})
