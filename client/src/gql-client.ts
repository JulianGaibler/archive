import { createClient } from 'graphql-ws'
import { uploadMiddleware } from './utils/middleware'
import { GraphQLClient } from 'graphql-request'

export const getSsrClient = (token: string | undefined, request: Request) => {
  const headers: { [key: string]: string } = {
    cookie: `token=${token}`,
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
})

export const webSubscriptionsClient =
  typeof window === 'undefined'
    ? null
    : createClient({
        url: 'ws://localhost:4000/sub',
      })
// TODO reconnect on error

export type { GraphQLClient as GqlClient }
