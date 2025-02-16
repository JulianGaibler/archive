import { Client, cacheExchange, fetchExchange } from 'urql'
import { ssrExchange } from '@urql/core'

const ssr = ssrExchange({
  isClient: false,
})

// TODO: use token as cache key and set ttl
export const getSsrClient = (token: string | undefined) =>
  new Client({
    url: 'http://localhost:4000',
    exchanges: [cacheExchange, ssr, fetchExchange],
    fetchOptions: {
      headers: {
        cookie: `token=${token}`,
      },
    },
  })

export const webClient = new Client({
  url: 'http://localhost:4000',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: {
    credentials: 'include',
  },
})

export type { Client as UrqlClient }
