import { gql } from "graphql-request";

export const APPROVE_PRODUCT_TEMPLATE_REQUEST = gql`
  mutation approveProductTemplateRequest($id: Int!, $adminNote: String) {
    approveProductTemplateRequest(id: $id, adminNote: $adminNote) {
      id
      status
    }
  }
`;

export const REJECT_PRODUCT_TEMPLATE_REQUEST = gql`
  mutation rejectProductTemplateRequest($id: Int!, $rejectionReason: String, $adminNote: String) {
    rejectProductTemplateRequest(id: $id, rejectionReason: $rejectionReason, adminNote: $adminNote) {
      id
      status
    }
  }
`;

export const MERGE_PRODUCT_TEMPLATE_REQUEST = gql`
  mutation mergeProductTemplateRequest($id: Int!, $targetTemplateId: Int!, $adminNote: String) {
    mergeProductTemplateRequest(id: $id, targetTemplateId: $targetTemplateId, adminNote: $adminNote) { id status mergedIntoTemplateId }
  }
`;
