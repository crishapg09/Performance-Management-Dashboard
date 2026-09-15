import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// `base` must match the path the site is served from.
//   GitHub Pages serves a project site from a sub-path:  /<repo-name>/
//   Azure Static Web Apps serves from the domain root:   /
// Pages is the default so that workflow needs no change; the Azure build sets
// BASE_PATH=/ to override it.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/Performance-Management-Dashboard/',
  plugins: [react()],
})
