import { gql } from "graphql-request";

export const FIND_MANY_VARIANTS = gql`
  query findManyVariants($productId: Int!, $search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyVariants(productId: $productId, search: $search, page: $page, limit: $limit, isFull: $isFull) {
      variants {
        id
        name
        description
        sku
        productId
        tags {
          id
          value
        }
        images {
          id
          url
        }
        products {
          id
        }
      }
      totalVariants
    }
  }
`;

export const FIND_ONE_VARIANT = gql`
  query findOneVariant($id: Int!) {
    findOneVariant(id: $id) {
      id
      name
      description
      sku
      productId
      tags {
        id
        value
      }
      images {
        id
        url
      }
      products {
        id
      }
    }
  }
`;
