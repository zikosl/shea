import { GraphQLClient } from 'graphql-request'
import { endpoint } from "@/constant";

export const client = new GraphQLClient(endpoint);