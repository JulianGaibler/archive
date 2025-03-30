/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    gqlClient: import('graphql-request').GraphQLClient
  }
}

declare module '*.gql' {
  const content: string
  export default content
}
