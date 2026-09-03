import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // SCOPI backend (Express) will live on 3001 — uncomment when it exists:
    // proxy: {
    //   '/api': 'http://localhost:3001',
    // },
  },
})