import { gql } from "graphql-request";

export const CREATE_VARIANTS = gql`
  mutation createVariant($productId: Int!, $data: [ProductVariantInput!]!) {
    createVariant(productId: $productId, data: $data) {
      id
      name
      name_ar
      description
      description_ar
      sku
      barcode
    }
  }
`;

export const UPDATE_VARIANT = gql`
  mutation updateVariant($id: Int!, $data: UpdateVariantInput!) {
    updateVariant(id: $id, data: $data) {
      id
      name
      name_ar
      description
      description_ar
      tags { id value }
      sku
      barcode
      images {
        id
        url
      }
    }
  }
`;

export const DELETE_VARIANT = gql`
  mutation deleteVariant($id: Int!) {
    deleteVariant(id: $id) {
      id
    }
  }
`;

export const DELETE_VARIANTS = gql`
  mutation DeleteVariants($ids: [Int!]!) {
    deleteVariants(ids: $ids)
  }
`;

export const MOVE_VARIANT_TO_TEMPLATE = gql`
  mutation MoveVariantToTemplate($variantId: Int!, $targetTemplateId: Int!) {
    moveVariantToTemplate(variantId: $variantId, targetTemplateId: $targetTemplateId) {
      id
      productId
    }
  }
`;
