
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:4000",
  documents: "src/queries/**/*.gql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations"]
    }
  }
};

export default config;
