import { GraphQLClient, type RequestDocument, type Variables } from "graphql-request";

const normalizeBaseUrl = (value?: string) => value?.replace(/\/+$/, "") ?? "";

const publicApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) || "/api";
const internalApiBaseUrl =
  normalizeBaseUrl(process.env.INTERNAL_API_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) ||
  "http://backend:3001";

const withGraphqlPath = (baseUrl: string) =>
  baseUrl.endsWith("/graphql") ? baseUrl : `${baseUrl}/graphql`;

const createHeaders = (accessToken?: string) =>
  accessToken
    ? {
      authorization: `Bearer ${accessToken}`,
    }
    : undefined;

export const publicGraphqlEndpoint = withGraphqlPath(publicApiBaseUrl);
export const internalGraphqlEndpoint = withGraphqlPath(internalApiBaseUrl);

export const createPublicGraphQLClient = (accessToken?: string) =>
  new GraphQLClient(publicGraphqlEndpoint, {
    headers: createHeaders(accessToken),
  });

export const createInternalGraphQLClient = (accessToken?: string) =>
  new GraphQLClient(internalGraphqlEndpoint, {
    headers: createHeaders(accessToken),
  });

export async function requestPublicGraphQL<TData, TVariables extends Variables = Variables>(
  document: RequestDocument,
  variables?: TVariables,
  accessToken?: string,
) {
  return createPublicGraphQLClient(accessToken).request<TData>(document, variables);
}

export async function requestInternalGraphQL<TData, TVariables extends Variables = Variables>(
  document: RequestDocument,
  variables?: TVariables,
  accessToken?: string,
) {
  return createInternalGraphQLClient(accessToken).request<TData>(document, variables);
}
