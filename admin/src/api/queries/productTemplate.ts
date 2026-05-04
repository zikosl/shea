import { gql } from "graphql-request"

export const FIND_ONE_PRODUCT_TEMPLATE = gql`
  query findOneProductTemplate($id: Int!) {
    findOneProductTemplate(id: $id) {
      id
      name
      description
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
  query findManyProductTemplates($search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTemplates(search: $search, page: $page, limit: $limit, isFull: $isFull) {
      productTemplates {
        id
        name
        description
        product_type_id
        brand_id
        productType {
          id
          name
          name_ar
        }
        brand {
          id
          name
          image
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
