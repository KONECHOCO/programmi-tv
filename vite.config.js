import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'

// In sviluppo serve /epg/* dalla cartella .epg-cache (generata con `npm run epg:dev`),
// così i dati non finiscono dentro il bundle dell'app.
function localEpg() {
  const root = path.resolve('.epg-cache')
  const serve = (server) => {
    server.middlewares.use('/epg', (req, res, next) => {
      const file = path.join(root, decodeURIComponent(req.url.split('?')[0]))
      if (!file.startsWith(root) || !existsSync(file)) return next()
      res.setHeader('Content-Type', 'application/json')
      createReadStream(file).pipe(res)
    })
  }
  return { name: 'local-epg', configureServer: serve, configurePreviewServer: serve }
}

// base relativa: funziona sia dentro l'app nativa sia su GitHub Pages (/programmi-tv/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), localEpg()],
})
