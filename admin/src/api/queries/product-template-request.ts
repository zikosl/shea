import { gql } from "graphql-request";

export const FIND_MANY_PRODUCT_TEMPLATE_REQUESTS = gql`
  query findManyProductTemplateRequests($status: ProductTemplateRequestStatus, $search: String, $niche_id: Int, $category_id: Int, $product_type_id: Int, $page: Int!, $limit: Int!) {
    findManyProductTemplateRequests(status: $status, search: $search, niche_id: $niche_id, category_id: $category_id, product_type_id: $product_type_id, page: $page, limit: $limit) {
      totalRequests
      requests {
        id
        name
        description
        images
        status
        rejectionReason
        adminNote
        createdAt
        category_id
        category { id name niche_id niche { id name } }
        partner {
          companyName
          user {
            email
          }
        }
        brand {
          name
          description
          image
        }
        productType {
          name
          category {
            name
          }
        }
        variants {
          id
          name
          sku
          image
          price
          stock
          tags
        }
      }
    }
  }
`;
