import { notFound } from 'next/navigation';

import { getItemById } from '../actions';
import { title_singular } from '../_constant';
import Form from './form';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type References = {
  productTypes: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
};

type ViewPageProps = {
  itemId: string;
  references: References;
};

export default async function ItemViewPage({ itemId, references }: ViewPageProps) {
  let item = null;
  let pageTitle = `Create New ${title_singular}`;

  if (itemId !== 'new') {
    item = await getItemById(itemId);
    if (!item) {
      notFound();
    }
    pageTitle = `Edit ${title_singular}`;
  }

  return <Form references={references} initialData={item} pageTitle={pageTitle} />;
}
