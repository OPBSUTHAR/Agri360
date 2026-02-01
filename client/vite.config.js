import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'leaflet-draw', replacement: path.resolve(__dirname, 'src/shims/leaflet-draw') },
      { find: 'leaflet.markercluster', replacement: path.resolve(__dirname, 'src/shims/leaflet-markercluster') },
      { find: 'leaflet-routing-machine', replacement: path.resolve(__dirname, 'src/shims/leaflet-routing-machine') },
      // Ensure Vite resolves prop-types to the installed package file on Windows
      { find: 'prop-types', replacement: path.resolve(__dirname, 'node_modules/prop-types/index.js') },
    ],
  },
  // Force pre-bundling of prop-types so react-leaflet-draw can import it
  optimizeDeps: {
    include: ['prop-types'],
  },
})
