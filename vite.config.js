// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // ← Asegurar que las rutas sean absolutas desde la raíz
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})