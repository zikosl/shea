import { gql } from 'graphql-request';

export const ADMIN_CATALOG_SUBMISSIONS = gql`
  query AdminCatalogSubmissions($status: CatalogSubmissionStatus) {
    adminCatalogSubmissions(status: $status) {
      id title status submittedAt createdAt
      partner { companyName user { email } }
      catalogProposals { id entityType status name name_ar nicheId categoryId parentProposalId rejectionReason }
      productRequests {
        id name name_ar status rejectionReason
        variants { id name sku price stock tags }
      }
    }
  }
`;
