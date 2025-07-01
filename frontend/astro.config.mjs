import nodejs from '@astrojs/node'
import svelte from '@astrojs/svelte'
import { defineConfig } from 'astro/config'
import graphqlLoader from 'vite-plugin-graphql-loader'
import envVarsIntegration from './integrations/env-vars.js'

const isDev = process.env.NODE_ENV === 'development'

// https://astro.build/config
export default defineConfig({
  site: process.env.CORS_ORIGIN || undefined,
  output: 'server',
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
        '~tint': '/node_modules/tint/dist',
        '@src': '/src',
      },
    },
    css: {
      preprocessorOptions: {
        sass: {
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
    svelte(),
    envVarsIntegration(),
  ],
})
