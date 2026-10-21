import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api calls to the Express backend in development (no CORS setup needed).
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
