import { gql } from "graphql-request"

const CREATE_DRIVER = gql`
  mutation createDriver($firstname: String!,$lastname: String!, $email: String!) {
    createDriver(firstname: $firstname,lastname: $lastname, email: $email) {
      id
      firstname
      lastname
      user {
        email
      }
    }
  }
`;

// Mutation to update an existing driver
const UPDATE_DRIVER = gql`
  mutation updateDriver($id: Int!, $firstname: String, $lastname: String, $email: String) {
    updateDriver(id: $id, firstname: $firstname, lastname: $lastname, email: $email) {
      id
      firstname
      lastname
      user {
        email
      }
    }
  }
`;

// Mutation to delete a driver
const DELETE_DRIVER = gql`
  mutation deleteDriver($id: Int!) {
    deleteDriver(id: $id) {
      id
    }
  }
`;

export {
  CREATE_DRIVER,
  UPDATE_DRIVER,
  DELETE_DRIVER
}