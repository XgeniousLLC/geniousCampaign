import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: {
    port: parseInt(process.env.WEB_PORT || '4000', 10),
    host: true,
  },
  optimizeDeps: {
    include: ['@genius-campaign/shared'],
  },
})
