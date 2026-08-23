import { notFound } from 'next/navigation';
import Form from './form';
import { getItemById } from '../actions';
import { title_singular } from '../_constant';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type TItemViewPageProps = {
  itemId: string;
};

export default async function ItemViewPage({
  itemId
}: TItemViewPageProps) {
  let item = null;
  let pageTitle = `Create New ${title_singular}`;

  if (itemId !== 'new') {
    item = await getItemById(itemId);
    if (!item) {
      notFound();
    }
    pageTitle = `Edit ${title_singular}`;
  }

  return <Form initialData={item} pageTitle={pageTitle} />;
}
