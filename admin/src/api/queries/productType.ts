import { gql } from "graphql-request"

export const FIND_ONE_PRODUCT_TYPE = gql`
  query findOneProductType($id: Int!) {
    findOneProductType(id: $id) {
      id
      name
      name_ar
      category {
        id
        name
        name_ar
      }
    }
  }
`;

export const GET_ALL_PRODUCT_TYPES = gql`
  query findManyProductTypes($page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTypes(page: $page, limit: $limit, isFull: $isFull) {
      productTypes {
        id
        name
        name_ar
        category {
          id
          name
          name_ar
        }
      }
      totalProductTypes
    }
  }
`;

export const FIND_MANY_PRODUCT_TYPES = gql`
  query findManyProductTypes($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTypes(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      productTypes {
        id
        name
        name_ar
        category {
          id
          name
          name_ar
        }
      }
      totalProductTypes
    }
  }
`;
