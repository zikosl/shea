const DEFAULT_GRAPHQL_URL = "http://localhost/api/graphql";
const DEFAULT_PUBLIC_URL = "http://localhost";
const DEFAULT_BASE_PATH = "/store";

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Shea Partner PWA",
  graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || DEFAULT_GRAPHQL_URL,
  publicUrl: process.env.NEXT_PUBLIC_PUBLIC_URL || DEFAULT_PUBLIC_URL,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || DEFAULT_BASE_PATH,
} as const;
