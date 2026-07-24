import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'path';

export default defineConfig({
  // Root domain deployment (yoginiarts.com) should use '/' (no /YoginiArts/ prefix)
  base: '/',
  
  root: './frontend',
  publicDir: './public',
  
  server: {
    port: 3300,
    host: true,
    allowedHosts: [
      'yoginiarts.onrender.com',
      '.onrender.com',
      'yoginiarts.com',
      'www.yoginiarts.com',
      '.yoginiarts.com',
      'localhost',
      '127.0.0.1'
    ]
  },
  preview: {
    port: process.env.PORT || 3300,
    host: '0.0.0.0',
    strictPort: false,
    // Allow all hosts for Render deployment (Render uses dynamic hostnames)
    // In production, this is safe as the server is behind Render's proxy
    allowedHosts: true
  },
  // Declare PostCSS inline instead of relying on postcss.config.js being found.
  // Vite looks for that file relative to `root` (./frontend), but it lives at the
  // repo root — a search that happened to succeed on Windows and failed on Linux.
  // When it failed, Vite inlined node_modules/tailwindcss/index.css verbatim, so
  // `@tailwind utilities` was never expanded and every deployed build (Render and
  // Vercel alike) shipped a stylesheet with no utility classes at all.
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      'src': path.resolve(__dirname, './frontend/src'),
      'components': path.resolve(__dirname, './frontend/src/components'),
      'utils': path.resolve(__dirname, './frontend/src/utils')
    },
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },
  build: {
    sourcemap: true,
    outDir: '../dist'
  }
});

