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
  query findManyProductTypes($niche_id: Int, $category_id: Int, $brand_id: Int, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTypes(niche_id: $niche_id, category_id: $category_id, brand_id: $brand_id, page: $page, limit: $limit, isFull: $isFull) {
      productTypes {
        id
        name
        name_ar
        category {
          id
          name
          name_ar
          niche_id
        }
      }
      totalProductTypes
    }
  }
`;

export const FIND_MANY_PRODUCT_TYPES = gql`
  query findManyProductTypes($search: String, $niche_id: Int, $category_id: Int, $brand_id: Int, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTypes(search: $search, niche_id: $niche_id, category_id: $category_id, brand_id: $brand_id, page: $page, limit: $limit, isFull: $isFull) {
      productTypes {
        id
        name
        name_ar
        category {
          id
          name
          name_ar
          niche_id
        }
      }
      totalProductTypes
    }
  }
`;
