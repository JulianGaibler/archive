import { createClient } from 'graphql-ws'
import { uploadMiddleware } from './utils/middleware'
import { GraphQLClient } from 'graphql-request'
import { createProgressFetch } from './utils/custom-fetch'

export const getSsrClient = (token: string | undefined, sessionId: string | undefined, request: Request) => {
  // Build cookie string with both token and sessionId
  const cookies = []
  if (token) cookies.push(`s-t=${token}`)
  if (sessionId) cookies.push(`s-id=${sessionId}`)
  
  const headers: { [key: string]: string } = {
    cookie: cookies.join('; '),
    'user-agent': request.headers.get('user-agent') || 'no ssr user-agent',
  }

  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    headers['x-forwarded-for'] = xForwardedFor
  }

  return new GraphQLClient('http://localhost:4000/api', {
    errorPolicy: 'all',
    headers,
  })
}

export const webClient = new GraphQLClient('http://localhost:4000/api', {
  errorPolicy: 'all',
  credentials: 'include',
  requestMiddleware: uploadMiddleware,
  fetch: createProgressFetch(),
})

export const webSubscriptionsClient =
  typeof window === 'undefined'
    ? null
    : createClient({
        url: 'ws://localhost:4000/sub',
      })
// TODO reconnect on error

export type { GraphQLClient as GqlClient }
