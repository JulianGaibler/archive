import { getSsrClient } from '@src/gql-client'
import { defineMiddleware } from 'astro/middleware'
import { getSdk } from './generated/graphql'

type MeType = Awaited<ReturnType<ReturnType<typeof getSdk>['me']>>

export type MeData =
  | {
      error: true
      signedIn: false
      me: null
    }
  | {
      error: false
      signedIn: true
      me: MeType
    }
  | {
      error: false
      signedIn: false
      me: null
    }

export const onRequest = defineMiddleware(async (ctx, next) => {
  const token = ctx.cookies.get('s-t')?.value
  const sessionId = ctx.cookies.get('s-id')?.value
  const ssrClient = getSsrClient(token, sessionId, ctx)
  ctx.locals.gqlClient = ssrClient

  const sdk = getSdk(ssrClient)

  let meQuery: MeData

  try {
    const me = await sdk.me()
    if (me.data.me) {
      meQuery = {
        error: false,
        signedIn: true,
        me,
      } as const satisfies MeData
    } else {
      meQuery = {
        error: false,
        signedIn: false,
        me: null,
      } as const satisfies MeData
    }
  } catch (_error) {
    meQuery = {
      error: true,
      signedIn: false,
      me: null,
    } as const satisfies MeData
  }

  ctx.locals.me = meQuery

  return next()
})
