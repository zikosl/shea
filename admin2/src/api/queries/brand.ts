import { gql } from "graphql-request"

export const FIND_ONE_BRAND = gql`
  query findOneBrand($id: Int!) {
    findOneBrand(id: $id) {
      id
      name
      image
    }
  }
`;

export const FIND_MANY_BRANDS = gql`
  query findManyBrands($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyBrands(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      brands {
        id
        name
        image
      }
      totalBrands
    }
  }
`;
