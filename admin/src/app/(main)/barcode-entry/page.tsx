import { ResourcePage } from "@/components/admin-panel/resource-page";
import { getCatalogFilterOptions } from "@/lib/catalog-filter-options";
import BarcodeLookupWorkspace from "./workspace";

export const metadata = { title: "Dashboard: Add product by barcode" };

export default async function BarcodeEntryPage() {
  const options = await getCatalogFilterOptions();
  return <ResourcePage title="Add product by barcode" description="Look up the package, match it to Shea, then assign or create its variant.">
    <BarcodeLookupWorkspace options={options} />
  </ResourcePage>;
}
