import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
    host: true,          // bind 0.0.0.0 so an ngrok tunnel can reach the dev server
    allowedHosts: true,  // accept the tunnel's Host header (else Vite returns "Blocked request")
  },
})
