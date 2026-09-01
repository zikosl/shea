import { gql } from "graphql-request";

export const FIND_MANY_CATALOG_PROPOSALS = gql`
  query FindManyCatalogProposals($status: CatalogProposalStatus, $entityType: CatalogProposalEntityType, $search: String, $page: Int!, $limit: Int!) {
    findManyCatalogProposals(status: $status, entityType: $entityType, search: $search, page: $page, limit: $limit) {
      total
      proposals {
        id localId entityType status name name_ar description image nicheId categoryId
        parentProposalId resolvedCategoryId resolvedProductTypeId rejectionReason adminNote createdAt
        partner { companyName user { email } }
      }
    }
  }
`;
