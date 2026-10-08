import { gql } from "graphql-request"

export const FIND_ONE_PRODUCT_TEMPLATE = gql`
  query findOneProductTemplate($id: Int!) {
    findOneProductTemplate(id: $id) {
      id
      name
      name_ar
      description
      description_ar
      product_type_id
      brand_id
      category_id
      niche_id
      productType {
        id
        name
        name_ar
      }
      brand {
        id
        name
        image
        niche_id
      }
      category {
        id
        name
        name_ar
        image
      }
      niche {
        id
        name
        name_ar
        image
      }
      images {
        id
        url
      }
    }
  }
`;

export const FIND_MANY_PRODUCT_TEMPLATES = gql`
  query findManyProductTemplates($search: String, $niche_id: Int, $category_id: Int, $product_type_id: Int, $brand_id: Int, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTemplates(search: $search, niche_id: $niche_id, category_id: $category_id, product_type_id: $product_type_id, brand_id: $brand_id, page: $page, limit: $limit, isFull: $isFull) {
      productTemplates {
        id
        name
        name_ar
        description
        description_ar
        product_type_id
        brand_id
        category_id
        niche_id
        productType {
          id
          name
          name_ar
        }
        brand {
          id
          name
          image
          niche_id
        }
        category {
          id
          name
          name_ar
          image
        }
        niche {
          id
          name
          name_ar
          image
        }
        images {
          id
          url
        }
      }
      totalProductTemplates
    }
  }
`;

export const FIND_TEMPLATE_MERGE_DATA = gql`
  query FindTemplateMergeData($id: Int!) {
    findOneProductTemplate(id: $id) {
      id
      name
      name_ar
      description
      category_id
      brand_id
      brand { id name }
      category { id name name_ar }
      images { id url }
      variants {
        id
        name
        name_ar
        sku
        barcode
        products { id }
      }
    }
  }
`;

export const SEARCH_TEMPLATE_MERGE_CANDIDATES = gql`
  query SearchTemplateMergeCandidates($search: String!, $category_id: Int, $page: Int!, $limit: Int!) {
    findManyProductTemplates(search: $search, category_id: $category_id, page: $page, limit: $limit, isFull: false) {
      productTemplates {
        id
        name
        name_ar
        category_id
        brand_id
        brand { id name }
        category { id name name_ar }
        images { id url }
        variants {
          id
          name
          name_ar
          sku
          barcode
          products { id }
        }
      }
      totalProductTemplates
    }
  }
`;
