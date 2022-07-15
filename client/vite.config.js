import react from '@vitejs/plugin-react'
import { join } from 'path'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

import { URL } from 'url'
const dirname = new URL('.', import.meta.url).pathname

export default defineConfig({
  plugins: [
    react(),
    svgr({
      exportAsDefault: true,
      svgrOptions: {
        svgo: false,
        prettier: false,
        ref: true,
      },
    }),
  ],
  root: 'src',
  // Relative to the root
  publicDir: '../public',
  build: { outDir: '../dist' },
  resolve: {
    alias: {
      '@src': join(dirname, 'src/'),
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: '@use "@src/styles/utils.sass" as archive\n',
      },
    },
  },
  server: {
    host: true,
    port: 3000,
  },
})
