import { gql } from "graphql-request";

export const ADMIN_DISCOVER_BARCODE = gql`
  query AdminDiscoverBarcode($barcode: String!) {
    adminDiscoverBarcode(barcode: $barcode) {
      status
      retryAfterSeconds
      existing { id productId name productName }
      external { name nameAr description brand quantity tags imageUrl sourceUrl sourceName }
      matches {
        templateId name description brand categoryId nicheId productTypeId brandId score reason
        variants { id name barcode sizeHint }
      }
    }
  }
`;
