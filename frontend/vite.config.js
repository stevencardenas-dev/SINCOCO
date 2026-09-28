import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // El backend Express corre en el puerto de backend/.env (3005 por defecto).
    // VITE_API_URL solo se define en el build de producción (ver api.js); en
    // desarrollo se deja sin definir para enrutar por el proxy.
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:3005',
    },
  },
})