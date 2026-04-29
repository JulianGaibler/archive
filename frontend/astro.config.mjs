import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import nodejs from '@astrojs/node'
import svelte from '@astrojs/svelte'
import { defineConfig } from 'astro/config'
import graphqlLoader from 'vite-plugin-graphql-loader'
import envVarsIntegration from './integrations/env-vars.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const tintDist = path.dirname(require.resolve('tint'))

const isDev = process.env.NODE_ENV === 'development'

// https://astro.build/config
const corsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? process.env.CORS_ORIGIN
  : undefined

export default defineConfig({
  site: corsOrigin,
  output: 'server',
  security: {
    allowedDomains: corsOrigin
      ? [{ hostname: new URL(corsOrigin).hostname }]
      : [],
  },
  adapter: nodejs({
    mode: 'standalone',
  }),
  server: {
    port: parseInt(process.env.FRONTEND_PORT) || 4321,
  },
  vite: {
    plugins: [graphqlLoader()],
    ssr: {
      noExternal: ['tint*'],
    },
    ...(isDev && {
      optimizeDeps: {
        exclude: ['tint'],
        include: ['remove-accents'],
      },
    }),
    resolve: {
      alias: {
        '~tint': tintDist,
        '@src': '/src',
      },
    },
    css: {
      preprocessorOptions: {
        sass: {
          loadPaths: [__dirname],
          additionalData: (d) => {
            const prepend = `@use "src/styles/utils.sass" as tint\n`
            const match = d.match(/^\s*/)
            const spaces = match ? match[0] : ''
            return `${spaces}${prepend}\n${d}`
          },
        },
      },
    },
  },
  integrations: [
    svelte({
      dynamicCompileOptions({ filename }) {
        // Use injected CSS for child components of fullscreen modals.
        // Astro's CSS aggregator orphans and deletes CSS from deeply nested
        // children of hydrated components, especially those using :global().
        // Injecting CSS via JS avoids this build-time issue entirely.
        const injectedCssPaths = [
          '/CaptionEditorModal/',
          '/FileAdjustModal/',
          '/TemplateEditorModal/',
          '/ModalHeader.svelte',
          '/CaptionOverlay.svelte',
        ]
        if (injectedCssPaths.some((p) => filename.includes(p))) {
          return { css: 'injected' }
        }
      },
    }),
    envVarsIntegration(),
  ],
})
