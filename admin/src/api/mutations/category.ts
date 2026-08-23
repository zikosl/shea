import { gql } from "graphql-request"

const CREATE_CATEGORY = gql`
  mutation createCategory($name: String!,$name_ar: String!,$image:String,$niche_id:Int) {
    createCategory(name: $name,name_ar:$name_ar,image:$image,niche_id:$niche_id) {
      id
      name
      name_ar
      image
      niche_id
    }
  }
`;

// Mutation to update an existing 
const UPDATE_CATEGORY = gql`
  mutation updateCategory($id: Int!,$name: String,$name_ar: String,image:String,$niche_id:Int) {
    updateCategory(id: $id, name: $name,name_ar:$name_ar,image:$image,niche_id:$niche_id){
      id
      name
      name_ar
      image
      niche_id
    }
  }
`;

// Mutation to delete a 
const DELETE_CATEGORY = gql`
  mutation deleteCategory($id: Int!) {
    deleteCategory(id: $id) {
      id
    }
  }
`;

export {
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY
}
