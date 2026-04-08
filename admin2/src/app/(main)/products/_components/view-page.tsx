import { notFound } from 'next/navigation';
import Form from './form';
import { getItemById } from '../actions';
import { title_singular } from '../_constant';

type TItemViewPageProps = {
  itemId: string;
  data: Category[]
};

export default async function ItemViewPage({
  data,
  itemId
}: TItemViewPageProps) {
  let item = null;
  let pageTitle = `Create New ${title_singular}`;

  if (itemId !== 'new') {
    item = await getItemById(itemId);
    if (!item) {
      notFound();
    }
    pageTitle = `Edit Partner`;
  }

  return <Form data={data} initialData={item} pageTitle={pageTitle} />;
}
