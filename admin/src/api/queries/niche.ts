import { gql } from "graphql-request";

export const FIND_ONE_NICHE = gql`
  query findOneNiche($id: Int!) {
    findOneNiche(id: $id) {
      id
      name
      name_ar
      image
    }
  }
`;

export const GET_ALL_NICHES = gql`
  query getAllNiches {
    getAllNiches {
      id
      name
      name_ar
      image
    }
  }
`;

export const FIND_MANY_NICHES = gql`
  query findManyNiches($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyNiches(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      niches {
        id
        name
        name_ar
        image
      }
      totalNiches
    }
  }
`;
