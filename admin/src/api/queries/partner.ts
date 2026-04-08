import { gql } from "graphql-request"

// Query to find one partner by ID
export const FIND_ONE_PARTNER = gql`
  query findOnePartner($id: Int!) {
    findOnePartner(id: $id) {
      id
      companyName
      user {
          email
      }
    }
  }
`;

// Query to find many partners with pagination and search
export const FIND_MANY_PARTNERS = gql`
  query findManyPartners($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyPartners(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      partners {
        id
        companyName
        user {
          email
        }
      }
      totalPartners
    }
  }
`;
