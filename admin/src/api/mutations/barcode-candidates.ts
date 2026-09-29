import { gql } from "graphql-request";

export const REVIEW_BARCODE_CANDIDATE = gql`
  mutation ReviewBarcodeCandidate($id: String!, $approve: Boolean!) {
    reviewBarcodeCandidate(id: $id, approve: $approve) { id status }
  }
`;

export const SUBMIT_BARCODE_CANDIDATE = gql`
  mutation SubmitBarcodeCandidate($variantId: Int!, $barcode: String!, $sourceUrl: String!, $sourceName: String) {
    submitBarcodeCandidate(variantId: $variantId, barcode: $barcode, sourceUrl: $sourceUrl, sourceName: $sourceName) { id status }
  }
`;
