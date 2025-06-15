import { getSsrClient } from '@src/gql-client'
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(
  ({ request, cookies, locals }, next) => {
    const token = cookies.get('s-t')?.value
    const sessionId = cookies.get('s-id')?.value
    locals.gqlClient = getSsrClient(token, sessionId, request)
    return next()
  },
)
