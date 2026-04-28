import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
    strictPort: false,
  },
  optimizeDeps: {
    exclude: ['@base-org/account'],
    include: ['buffer'],
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/wagmi/')) {
            return 'wagmi'
          }
        },
      },
    },
  },
})
