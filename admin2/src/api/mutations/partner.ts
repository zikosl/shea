import { gql } from "graphql-request"

const CREATE_PARTNER = gql`
  mutation createPartner($companyName: String!, $email: String!) {
    createPartner(companyName: $companyName, email: $email) {
      id
      companyName
      user {
        email
      }
    }
  }
`;

// Mutation to update an existing partner
const UPDATE_PARTNER = gql`
  mutation updatePartner($id: Int!, $companyName: String, $email: String) {
    updatePartner(id: $id, companyName: $companyName, email: $email) {
      id
      companyName
      user {
        email
      }
    }
  }
`;

// Mutation to delete a partner
const DELETE_PARTNER = gql`
  mutation deletePartner($id: Int!) {
    deletePartner(id: $id) {
      id
    }
  }
`;

export {
  CREATE_PARTNER,
  UPDATE_PARTNER,
  DELETE_PARTNER
}