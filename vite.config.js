import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Base path for GitHub Pages (if hosting on GitHub Pages)
  // Remove this base if using a custom domain or root domain
  base: process.env.NODE_ENV === 'production' ? '/YoginiArts/' : '/',
  
  root: './frontend',
  publicDir: '../public',
  
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: process.env.PORT || 3000,
    host: true,
    allowedHosts: [
      'yoginiarts.onrender.com',
      '.onrender.com', // Allow all Render subdomains
      'localhost',
      '127.0.0.1'
    ]
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

