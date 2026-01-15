import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  server: {
    port: 8083,
    open: true,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8080/',
        changeOrigin: true
      },
      '/webjars': {
        target: 'http://localhost:8080/',
        changeOrigin: true
      },
      '/group-call': {
        target: 'http://localhost:8080/',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://localhost:8080/',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../backend/src/main/resources/dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // vue와 element-plus를 함께 묶어서 초기화 순서 문제 방지
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('vue-router') || id.includes('vuex') || id.includes('element-plus')) {
              return 'vue-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/common/css/common.css";`
      },
      stylus: {
        // Stylus 옵션
      }
    }
  }
})

