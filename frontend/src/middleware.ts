import { getSsrClient } from '@src/gql-client'
import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware((ctx, next) => {
  console.log('=== Request Debug Info ===');
  console.log('URL:', ctx.url.href);
  console.log('Method:', ctx.request.method);
  console.log('Headers:');
  
  // Log all headers
  for (const [key, value] of ctx.request.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  console.log('========================');

  const token = ctx.cookies.get('s-t')?.value
  const sessionId = ctx.cookies.get('s-id')?.value
  ctx.locals.gqlClient = getSsrClient(token, sessionId, ctx)
  return next()
})
