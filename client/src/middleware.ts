import { getSsrClient } from '@src/urql-client'
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(({ cookies, locals }, next) => {
  locals.gqlClient = getSsrClient(cookies.get('token')?.value)
  return next()
})
