import { gql } from "graphql-request"

export const FIND_ONE_CATEGORY = gql`
  query findOneCategory($id: Int!) {
    findOneCategory(id: $id) {
      id
      name
      name_ar
      image
      niche_id
      niche {
        id
        name
      }
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
  query findManyCategories($search: String, $niche_id: Int, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyCategories(search: $search, niche_id: $niche_id, page: $page, limit: $limit, isFull: $isFull) {
      categories {
        id
        name
        name_ar
        image
        niche_id
        niche {
          id
          name
        }
      }
      totalCategories
    }
  }
`;
