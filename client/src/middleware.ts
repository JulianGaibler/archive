import { getSsrClient } from '@src/gql-client'
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware((ctx, next) => {
  const token = ctx.cookies.get('s-t')?.value
  const sessionId = ctx.cookies.get('s-id')?.value
  ctx.locals.gqlClient = getSsrClient(token, sessionId, ctx)
  return next()
})
