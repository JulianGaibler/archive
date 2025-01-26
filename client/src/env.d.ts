/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    gqlClient: import('urql').Client
  }
}

declare module '*.gql' {
  import { type TypedDocumentNode } from 'urql'
  const Schema: TypedDocumentNode
  
  export = Schema
}
