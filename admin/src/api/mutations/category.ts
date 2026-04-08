import { gql } from "graphql-request"

const CREATE_CATEGORY = gql`
  mutation createCategory($name: String!,$name_ar: String!,$image:String) {
    createCategory(name: $name,name_ar:$name_ar,image:$image) {
      id
      name
      name_ar
      image
    }
  }
`;

// Mutation to update an existing 
const UPDATE_CATEGORY = gql`
  mutation updateCategory($id: Int!,$name: String,$name_ar: String,image:String) {
    updateCategory(id: $id, name: $name,name_ar:$name_ar,image:$image){
      id
      name
      name_ar
      image
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