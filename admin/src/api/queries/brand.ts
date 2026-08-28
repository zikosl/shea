import { gql } from "graphql-request"

export const FIND_ONE_BRAND = gql`
  query findOneBrand($id: Int!) {
    findOneBrand(id: $id) {
      id
      name
      image
      niche_id
      niche {
        id
        name
        name_ar
      }
    }
  }
`;

export const GET_ALL_BRANDS = gql`
  query getAllBrands($niche_id: Int) {
    getAllBrands(niche_id: $niche_id) {
      id
      name
      image
      niche_id
      niche {
        id
        name
        name_ar
      }
    }
  }
`;

export const FIND_MANY_BRANDS = gql`
  query findManyBrands($search: String, $niche_id: Int, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyBrands(search: $search, niche_id: $niche_id, page: $page, limit: $limit, isFull: $isFull) {
      brands {
        id
        name
        image
        niche_id
        niche {
          id
          name
          name_ar
        }
      }
      totalBrands
    }
  }
`;
