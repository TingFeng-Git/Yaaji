import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
        options: resolve(__dirname, 'options/index.html'),
        background: resolve(__dirname, 'background/service-worker.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background/service-worker.js'
          }
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (/\.(png|jpe?g|gif|svg|ico)$/i.test(assetInfo.name)) {
            return 'icons/[name][extname]'
          }
          return 'assets/[name][extname]'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './')
    }
  },
  publicDir: 'public'
})
