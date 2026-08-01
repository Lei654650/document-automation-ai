import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devApiProxy = process.env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          if (!moduleId.includes('node_modules')) return undefined
          if (moduleId.includes('lucide-react')) return 'icons'
          if (moduleId.includes('react-dom') || moduleId.includes('/react/')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': devApiProxy,
    },
  },
})
