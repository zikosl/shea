import { gql } from "graphql-request"

const CREATE_BRAND = gql`
  mutation createBrand($name: String!,$image: String!, $niche_id: Int) {
    createBrand(name: $name,image:$image,niche_id:$niche_id) {
      id
      name
      image
      niche_id
    }
  }
`;

// Mutation to update an existing 
const UPDATE_BRAND = gql`
  mutation updateBrand($id: Int!,$name: String,$image: String,$niche_id: Int) {
    updateBrand(id: $id, name: $name,image:$image,niche_id:$niche_id){
      id
      name
      image
      niche_id
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
