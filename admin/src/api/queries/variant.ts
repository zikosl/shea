import { gql } from "graphql-request";

export const ADMIN_CATALOG_VARIANTS = gql`
  query AdminCatalogVariants($search: String, $nicheId: Int, $categoryId: Int, $productTypeId: Int, $brandId: Int, $page: Int!, $limit: Int!) {
    adminCatalogVariants(search: $search, nicheId: $nicheId, categoryId: $categoryId, productTypeId: $productTypeId, brandId: $brandId, page: $page, limit: $limit) {
      totalVariants
      variants {
        id
        name
        name_ar
        sku
        barcode
        productId
        image
        product {
          id
          name
          name_ar
          category { id name name_ar }
          images { url }
        }
      }
    }
  }
`;

export const FIND_MANY_VARIANTS = gql`
  query findManyVariants($productId: Int!, $search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyVariants(productId: $productId, search: $search, page: $page, limit: $limit, isFull: $isFull) {
      variants {
        id
        name
        name_ar
        description
        description_ar
        sku
        barcode
        productId
        tags {
          id
          value
        }
        images {
          id
          url
        }
        products {
          id
        }
      }
      totalVariants
    }
  }
`;

export const FIND_ONE_VARIANT = gql`
  query findOneVariant($id: Int!) {
    findOneVariant(id: $id) {
      id
      name
      name_ar
      description
      description_ar
      sku
      barcode
      productId
      tags {
        id
        value
      }
      images {
        id
        url
      }
      products {
        id
      }
    }
  }
`;
