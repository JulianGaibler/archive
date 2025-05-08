import { getSsrClient } from '@src/gql-client'
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(
  ({ request, cookies, locals }, next) => {
    locals.gqlClient = getSsrClient(cookies.get('token')?.value, request)
    return next()
  },
)
