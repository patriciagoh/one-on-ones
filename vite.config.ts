/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the built SPA works when served from a GitHub Pages
  // subpath (patriciagoh.github.io/one-on-ones/) as well as locally.
  base: './',
  plugins: [react()],
  test: { globals: true, environment: 'node' },
})
