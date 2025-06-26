/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    gqlClient: import('graphql-request').GraphQLClient
    me: import('./middleware').MeData
  }
}

declare module '*.gql' {
  const content: string
  export default content
}
