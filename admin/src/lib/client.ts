import { GraphQLClient } from 'graphql-request'
import { serverEndpoint } from "@/constant";

export const client = new GraphQLClient(serverEndpoint);