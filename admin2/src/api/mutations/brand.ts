import { gql } from "graphql-request"

const CREATE_BRAND = gql`
  mutation createBrand($name: String!,$image: String!) {
    createBrand(name: $name,image:$image) {
      id
      name
      image
    }
  }
`;

// Mutation to update an existing 
const UPDATE_BRAND = gql`
  mutation updateBrand($id: Int!,$name: String,$image: String) {
    updateBrand(id: $id, name: $name,image:$image){
      id
      name
      image
    }
  }
`;

// Mutation to delete a 
const DELETE_BRAND = gql`
  mutation deleteBrand($id: Int!) {
    deleteBrand(id: $id) {
      id
    }
  }
`;

export {
  CREATE_BRAND,
  UPDATE_BRAND,
  DELETE_BRAND
}