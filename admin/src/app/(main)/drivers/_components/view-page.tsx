import { notFound } from 'next/navigation';
import Form from './form';
import { getItemById } from '../actions';
import { title_singular } from '../_constant';

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
    pageTitle = `Edit Driver`;
  }

  return <Form initialData={item} pageTitle={pageTitle} />;
}
