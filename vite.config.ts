import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['gapi-script']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'gapi-script', 'react-dropzone', 'uuid'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    https: true,
  },
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.VITE_ALLOWED_ORIGINS': JSON.stringify([
      'https://youtubebatchuploader.fun'
    ])
  }
});