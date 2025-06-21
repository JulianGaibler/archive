import { createClient } from 'graphql-ws'
import { uploadMiddleware } from './utils/middleware'
import { GraphQLClient } from 'graphql-request'
import { createProgressFetch } from './utils/custom-fetch'
import type { APIContext, AstroCookieSetOptions } from 'astro'
import * as cookie from 'cookie'
import serverEnv from 'virtual:env/server'
import clientEnv from 'virtual:env/client'

const PUBLIC_URL = `${clientEnv.FRONTEND_PUBLIC_API_BASE_URL}${clientEnv.FRONTEND_PUBLIC_GRAPHQL_ENDPOINT}`
const PUBLIC_URL_WS = `${clientEnv.FRONTEND_PUBLIC_API_BASE_URL}${clientEnv.FRONTEND_PUBLIC_WS_ENDPOINT}`
const PRIVATE_URL = `${serverEnv.FRONTEND_PRIVATE_API_BASE_URL}${serverEnv.FRONTEND_PRIVATE_GRAPHQL_ENDPOINT}`

export const getSsrClient = (
  token: string | undefined,
  sessionId: string | undefined,
  astroContext: APIContext<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>,
    Record<string, string | undefined>
  >,
) => {
  // Build cookie string with both token and sessionId
  const cookies = []
  if (token) cookies.push(`s-t=${token}`)
  if (sessionId) cookies.push(`s-id=${sessionId}`)

  const headers: { [key: string]: string } = {
    cookie: cookies.join('; '),
    'user-agent':
      astroContext.request.headers.get('user-agent') || 'no ssr user-agent',
  }

  const xForwardedFor = astroContext.request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    headers['x-forwarded-for'] = xForwardedFor
  }

  // Create a custom fetch that captures Set-Cookie headers when astroCookies is provided
  const customFetch: typeof fetch = async (input, init) => {
    const response = await fetch(input as RequestInfo | URL, init)

    // Cookie handling
    const setCookieHeaders = response.headers.getSetCookie?.() || []
    setCookieHeaders.forEach((cookieHeader) => {
      // Parse the cookie header using the cookie library for safe parsing
      const parsed = cookie.parse(cookieHeader)

      // The cookie library returns an object with key-value pairs
      // For Set-Cookie headers, we need to handle the first key-value pair
      // and then parse the remaining attributes manually
      const [nameValue, ...optionsParts] = cookieHeader.split(';')
      const equalIndex = nameValue.indexOf('=')
      const name = nameValue.slice(0, equalIndex).trim()
      const value = parsed[name] || '' // Use parsed value which is properly decoded

      // Parse cookie options
      const options: AstroCookieSetOptions = {}
      optionsParts.forEach((part) => {
        const [key, val] = part.split('=').map((p) => p.trim())
        const lowerKey = key.toLowerCase()

        if (lowerKey === 'httponly') options.httpOnly = true
        else if (lowerKey === 'secure') options.secure = true
        else if (lowerKey === 'samesite')
          options.sameSite = val as 'lax' | 'strict' | 'none'
        else if (lowerKey === 'path') options.path = val
        else if (lowerKey === 'domain') options.domain = val
        else if (lowerKey === 'expires') options.expires = new Date(val)
        else if (lowerKey === 'max-age') options.maxAge = parseInt(val)
      })

      astroContext.cookies.set(name, value, options)
    })

    return response
  }

  return new GraphQLClient(PRIVATE_URL, {
    errorPolicy: 'all',
    headers,
    fetch: customFetch,
  })
}

export const webClient = new GraphQLClient(PUBLIC_URL, {
  errorPolicy: 'all',
  credentials: 'include',
  requestMiddleware: uploadMiddleware,
  fetch: createProgressFetch(),
})

export const webSubscriptionsClient =
  typeof window === 'undefined'
    ? null
    : (() => {
        const wsUrl = PUBLIC_URL_WS
        return wsUrl ? createClient({ url: PUBLIC_URL_WS }) : null
      })()
// TODO reconnect on error

export type { GraphQLClient as GqlClient }
