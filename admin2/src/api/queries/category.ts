import { gql } from "graphql-request"

export const FIND_ONE_CATEGORY = gql`
  query findOneCategory($id: Int!) {
    findOneCategory(id: $id) {
      id
      name
      name_ar
    }
  }
`;

export const GET_ALL_CATEGORIES = gql`
  query getAllCategories {
    getAllCategories {
      id
      name
      name_ar
      image
    }
  }
`;

export const FIND_MANY_CATEGORIES = gql`
  query findManyCategories($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyCategories(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      categories {
        id
        name
        name_ar
        image
      }
      totalCategories
    }
  }
`;
