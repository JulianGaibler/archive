import type { APIRoute } from 'astro'
import clientEnv from 'virtual:env/client'

export const GET: APIRoute = () => {
  const publicUrl = clientEnv.PUBLIC_URL || 'http://localhost:4321'
  // Remove trailing slash for consistency
  const baseUrl = publicUrl.replace(/\/$/, '')
  // Extract hostname for the id field
  const hostname = new URL(baseUrl).hostname

  const manifest = {
    theme_color: '#ffffff',
    background_color: '#d4213a',
    orientation: 'any',
    display: 'standalone',
    name: 'Archive',
    short_name: 'Archive',
    start_url: '/',
    scope: `${baseUrl}/`,
    id: hostname,
    description: 'Where memes go to die.',
    edge_side_panel: {},
    icons: [
      {
        src: '/pwa/icon-default-192.png',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        src: '/pwa/icon-default-512.png',
        type: 'image/png',
        sizes: '512x512',
      },
      {
        src: '/pwa/icon-default-1024.png',
        type: 'image/png',
        sizes: '1024x1024',
      },
      {
        src: '/pwa/icon-masked-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'maskable',
      },
      {
        src: '/pwa/icon-masked-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
      {
        src: '/pwa/icon-masked-1024.png',
        type: 'image/png',
        sizes: '1024x1024',
        purpose: 'maskable',
      },
      {
        src: '/pwa/icon-monochrome-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'monochrome',
      },
      {
        src: '/pwa/icon-monochrome-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'monochrome',
      },
      {
        src: '/pwa/icon-monochrome-1024.png',
        type: 'image/png',
        sizes: '1024x1024',
        purpose: 'monochrome',
      },
      {
        src: '/pwa/icon-monochrome-masked-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'monochrome maskable',
      },
      {
        src: '/pwa/icon-monochrome-masked-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'monochrome maskable',
      },
      {
        src: '/pwa/icon-monochrome-masked-1024.png',
        type: 'image/png',
        sizes: '1024x1024',
        purpose: 'monochrome maskable',
      },
    ],
    shortcuts: [
      {
        name: 'New post',
        url: '/new-post',
        icons: [
          {
            src: '/pwa/action-add-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Keywords',
        url: '/keywords',
        icons: [
          {
            src: '/pwa/action-tag-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Humans',
        url: '/humans',
        icons: [
          {
            src: '/pwa/action-user-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Settings',
        url: '/settings',
        icons: [
          {
            src: '/pwa/action-settings-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
