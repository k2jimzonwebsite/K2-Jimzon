import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()], envDir: false,
  define: { 'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify('1x00000000000000000000AA') },
  cacheDir: 'node_modules/.vite-security-check', server: { watch: null },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client'] },
})
