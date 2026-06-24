import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le repo GitHub s'appelle LDMFAB → GitHub Pages sert sous /LDMFAB/
export default defineConfig({
  plugins: [react()],
  base: '/LDMFAB/',
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
