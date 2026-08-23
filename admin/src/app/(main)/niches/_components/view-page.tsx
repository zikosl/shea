import { notFound } from "next/navigation";

import { getItemById } from "../actions";
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

  if (itemId !== "new") {
    item = await getItemById(itemId);
    if (!item) {
      notFound();
    }
    pageTitle = `Edit ${title_singular}`;
  }

  return <Form initialData={item} pageTitle={pageTitle} />;
}
