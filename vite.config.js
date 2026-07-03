// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // ✅ Base URL para rutas absolutas
  base: '/',
  
  // ✅ Configuración de build para producción
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // ✅ CORREGIDO: manualChunks debe ser una FUNCIÓN
        manualChunks(id) {
          // Separar dependencias de terceros
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  
  // ✅ Configuración del servidor de desarrollo
  server: {
    port: 5175,
    open: true,
    hmr: {
      overlay: true,
    },
  },
  
  // ✅ Configuración para preview
  preview: {
    port: 5175,
    open: true,
  },
  
  // ✅ Resolución de módulos con alias
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@lib': '/src/lib',
      '@assets': '/src/assets',
    },
  },
  
  // ✅ Variables de entorno
  envPrefix: 'VITE_',
})