import { gql } from "graphql-request";

export const APPROVE_CATALOG_PROPOSAL = gql`
  mutation ApproveCatalogProposal($id: String!, $adminNote: String) {
    approveCatalogProposal(id: $id, adminNote: $adminNote) { id status resolvedCategoryId resolvedProductTypeId }
  }
`;
export const MERGE_CATALOG_PROPOSAL = gql`
  mutation MergeCatalogProposal($id: String!, $targetId: Int!, $adminNote: String) {
    mergeCatalogProposal(id: $id, targetId: $targetId, adminNote: $adminNote) { id status resolvedCategoryId resolvedProductTypeId }
  }
`;
export const REJECT_CATALOG_PROPOSAL = gql`
  mutation RejectCatalogProposal($id: String!, $rejectionReason: String!, $adminNote: String) {
    rejectCatalogProposal(id: $id, rejectionReason: $rejectionReason, adminNote: $adminNote) { id status rejectionReason }
  }
`;
