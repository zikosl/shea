import { notFound } from "next/navigation";

import { getItemById, getNicheCapabilities } from "../actions";
import { title_singular } from "../_constant";
import Form from "./form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type ItemViewPageProps = {
  itemId: string;
};

export default async function ItemViewPage({ itemId }: ItemViewPageProps) {
  let item = null;
  let pageTitle = `Create New ${title_singular}`;
  let capabilityConfig: { catalog: CapabilityCode[]; enabled: CapabilityCode[] } | null = null;

  if (itemId !== "new") {
    item = await getItemById(itemId);
    if (!item) {
      notFound();
    }
    pageTitle = `Edit ${title_singular}`;
    capabilityConfig = await getNicheCapabilities(itemId);
  }

  return <Form initialData={item} capabilityConfig={capabilityConfig} pageTitle={pageTitle} />;
}
