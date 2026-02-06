import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const osdlCore = path.resolve(__dirname, './packages/osdl/core');
const osdlRuntime = path.resolve(osdlCore, './osdl');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/osdl-demos/, replacement: path.resolve(__dirname, './src/osdl-demos') },
      { find: /^@\/osdl(\/|$)/, replacement: osdlRuntime + '/' },
      { find: /^@\/OSDL(\/|$)/, replacement: osdlCore + '/' },
      { find: /^@\/ComponentRegistry$/, replacement: path.resolve(osdlCore, './ComponentRegistry') },
      { find: /^@\/OSDL\.types$/, replacement: path.resolve(osdlCore, './OSDL.types') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, './src/shims/next/navigation') },
      { find: 'next/link', replacement: path.resolve(__dirname, './src/shims/next/link') },
      { find: 'next/image', replacement: path.resolve(__dirname, './src/shims/next/image') },
      { find: 'next/script', replacement: path.resolve(__dirname, './src/shims/next/script') },
      { find: 'next/font/google', replacement: path.resolve(__dirname, './src/shims/next/font/google') },
      { find: '@', replacement: path.resolve(__dirname, './src') }
    ]
  },
  server: {
    port: 5173
  }
});
