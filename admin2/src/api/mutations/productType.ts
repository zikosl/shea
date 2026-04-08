import { gql } from "graphql-request"

const CREATE_PRODUCT_TYPE = gql`
  mutation createProductType($name: String!,$name_ar: String!,$category_id: Int!) {
    createProductType(name: $name,name_ar:$name_ar,category_id:$category_id) {
      id
      name
      name_ar
    }
  }
`;

// Mutation to update an existing 
const UPDATE_PRODUCT_TYPE = gql`
  mutation updateProductType($id: Int!,$name: String,$name_ar: String,$category_id: Int) {
    updateProductType(id: $id, name: $name,name_ar:$name_ar,category_id:$category_id){
      id
      name
      name_ar
    }
  }
`;

// Mutation to delete a 
const DELETE_PRODUCT_TYPE = gql`
  mutation deleteProductType($id: Int!) {
    deleteProductType(id: $id) {
      id
    }
  }
`;

export {
  CREATE_PRODUCT_TYPE,
  UPDATE_PRODUCT_TYPE,
  DELETE_PRODUCT_TYPE
}