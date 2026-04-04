// Copyright 2026 Jeremiah Van Offeren
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const parsedDevPort = Number.parseInt(process.env.VITE_BIND_PORT || '3000', 10)
const devPort = Number.isInteger(parsedDevPort) && parsedDevPort > 0 ? parsedDevPort : 3000
const devHost = process.env.VITE_BIND_HOST || '0.0.0.0'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/__tests__/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/setupTests.js',
        'src/__tests__/**',
      ],
    },
  },
  plugins: [react()],
  server: {
    port: devPort,
    host: devHost,
    allowedHosts: ['wedding-app', 'wedding-app-test', 'localhost', process.env.VITE_BIND_HOST],
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://backend:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('papaparse')) return 'vendor-csv';
        }
      }
    }
  }
})
