// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  base: '/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // ✅ Deshabilitar sourcemaps para evitar problemas
    sourcemap: false,
    // ✅ Minificar con terser en lugar de esbuild
    minify: 'terser',
    // ✅ Configuración más simple
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  
  server: {
    port: 5175,
    open: true,
  },
  
  preview: {
    port: 5175,
    open: true,
  },
  
  // ✅ Alias simples
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  
  envPrefix: 'VITE_',
})