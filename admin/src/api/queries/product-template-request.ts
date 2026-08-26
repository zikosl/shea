import { gql } from "graphql-request";

export const FIND_MANY_PRODUCT_TEMPLATE_REQUESTS = gql`
  query findManyProductTemplateRequests($status: ProductTemplateRequestStatus, $page: Int!, $limit: Int!) {
    findManyProductTemplateRequests(status: $status, page: $page, limit: $limit) {
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
        partner {
          companyName
          user {
            email
          }
        }
        brand {
          name
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
