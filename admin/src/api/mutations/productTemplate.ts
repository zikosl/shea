import { gql } from "graphql-request"

const CREATE_PRODUCT_TEMPLATE = gql`
  mutation createProductTemplate(
    $name: String!
    $description: String
    $images: ImagesList
    $category_id: Int!
    $product_type_id: Int
    $brand_id: Int!
  ) {
    createProductTemplate(
      name: $name
      description: $description
      images: $images
      category_id: $category_id
      product_type_id: $product_type_id
      brand_id: $brand_id
    ) {
      id
      name
      description
      product_type_id
      category_id
      brand_id
    }
  }
`;

const UPDATE_PRODUCT_TEMPLATE = gql`
  mutation updateProductTemplate($id: Int!, $name: String, $description: String, $category_id: Int, $product_type_id: Int, $brand_id: Int) {
    updateProductTemplate(id: $id, name: $name, description: $description, category_id: $category_id, product_type_id: $product_type_id, brand_id: $brand_id) {
      id
      name
      description
      product_type_id
      category_id
      brand_id
    }
  }
`;

const UPDATE_PRODUCT_TEMPLATE_IMAGES = gql`
  mutation updateProductTemplateImages($id: Int!, $images: ImagesList) {
    updateProductTemplateImages(id: $id, images: $images) {
      id
      url
    }
  }
`;

const DELETE_PRODUCT_TEMPLATE = gql`
  mutation deleteProductTemplate($id: Int!) {
    deleteProductTemplate(id: $id) {
      id
    }
  }
`;

export {
  CREATE_PRODUCT_TEMPLATE,
  UPDATE_PRODUCT_TEMPLATE,
  UPDATE_PRODUCT_TEMPLATE_IMAGES,
  DELETE_PRODUCT_TEMPLATE,
}
