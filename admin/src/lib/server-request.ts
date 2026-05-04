import type { RequestDocument, Variables } from "graphql-request";

import { requestInternalGraphQL } from "@/lib/graphql";
import { requireAccessToken } from "@/lib/server-auth";

export async function requestServerGraphQL<TData, TVariables extends Variables = Variables>(
  document: RequestDocument,
  variables?: TVariables,
) {
  const accessToken = await requireAccessToken();
  return requestInternalGraphQL<TData, TVariables>(document, variables, accessToken);
}
