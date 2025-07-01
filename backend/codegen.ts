import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema/*.graphql",
  generates: {
    "src/apis/GraphQLApi/generated-types.ts": {
      plugins: [
        {
          add: {
            content: '/* eslint-disable @typescript-eslint/no-empty-object-type */\n/* eslint-disable @typescript-eslint/no-explicit-any */'
          }
        },
        "typescript",
        "typescript-resolvers"
      ],
      config: {
        useIndexSignature: true,
        contextType: "@src/server.js#Context",
        mappers: {
          User: "@src/models/UserModel.js#UserExternal",
          Post: "@src/models/PostModel.js#PostExternal",
          Item: "@src/models/ItemModel.js#ItemExternal",
          Keyword: "@src/models/KeywordModel.js#KeywordExternal",
          Session: "@src/models/SessionModel.js#SessionExternal",
          FileUpload: "graphql-upload/processRequest.mjs#FileUpload",
        },
        scalars: {
          DateTime: "number",
          Upload: "Promise<FileUpload>"
        }
      }
    }
  }
}

export default config
