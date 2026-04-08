import { gql } from "graphql-request"

// Query to find one driver by ID
export const FIND_ONE_DRIVER = gql`
  query findOneDriver($id: Int!) {
    findOneDriver(id: $id) {
      id
      firstname
      lastname
      user {
          email
      }
    }
  }
`;

// Query to find many drivers with pagination and search
export const FIND_MANY_DRIVERS = gql`
  query findManyDrivers($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyDrivers(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      drivers {
        id
        firstname
        lastname
        user {
          email
        }
      }
      totalDrivers
    }
  }
`;
