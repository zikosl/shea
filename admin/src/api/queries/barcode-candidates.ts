import { gql } from "graphql-request";

export const FIND_BARCODE_CANDIDATES = gql`
  query FindBarcodeCandidates($status: String, $page: Int!, $limit: Int!) {
    findBarcodeCandidates(status: $status, page: $page, limit: $limit) {
      total
      candidates {
        id
        barcode
        sourceUrl
        sourceName
        matchScore
        status
        createdAt
        variant {
          id
          name
          sku
          barcode
          images { url }
          product {
            id
            name
            brand { name }
            images { url }
          }
        }
      }
    }
  }
`;
