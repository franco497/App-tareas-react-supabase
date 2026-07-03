// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // ✅ Base URL para rutas absolutas (necesario para Netlify)
  base: '/',
  
  // ✅ Configuración de build para producción
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // ✅ Generar sourcemaps para debugging (opcional)
    sourcemap: false,
    // ✅ Minificar para producción
    minify: 'esbuild',
    // ✅ Tamaño de chunk para mejor rendimiento
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ✅ Nombres de archivos con hash para cache
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // ✅ Separar dependencias de terceros
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  
  // ✅ Configuración del servidor de desarrollo
  server: {
    port: 5175,
    // ✅ Abrir el navegador automáticamente
    open: true,
    // ✅ Hot Module Replacement (HMR)
    hmr: {
      overlay: true,
    },
  },
  
  // ✅ Configuración para preview (Netlify)
  preview: {
    port: 5175,
    open: true,
  },
  
  // ✅ Resolución de módulos
  resolve: {
    alias: {
      // ✅ Alias para importaciones más limpias (opcional)
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@lib': '/src/lib',
      '@assets': '/src/assets',
    },
  },
  
  // ✅ Variables de entorno disponibles en el cliente
  envPrefix: 'VITE_',
})