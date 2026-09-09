import { gql } from "graphql-request"

const CREATE_BRAND = gql`
  mutation createBrand($name: String!, $name_ar: String, $image: String!, $niche_id: Int) {
    createBrand(name: $name, name_ar: $name_ar, image:$image,niche_id:$niche_id) {
      id
      name
      name_ar
      image
      niche_id
    }
  }
`;

// Mutation to update an existing 
const UPDATE_BRAND = gql`
  mutation updateBrand($id: Int!, $name: String, $name_ar: String, $image: String, $niche_id: Int) {
    updateBrand(id: $id, name: $name, name_ar: $name_ar, image:$image,niche_id:$niche_id){
      id
      name
      name_ar
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
