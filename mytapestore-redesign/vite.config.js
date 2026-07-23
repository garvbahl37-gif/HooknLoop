import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    strictPort: true,
    host: true,          // bind 0.0.0.0 so a tunnel can reach the dev server
    allowedHosts: true,  // accept a tunnel's Host header
  },
})
