import { Suspense } from 'react';
import FormCardSkeleton from '@/components/form-card-skeleton';
import ViewPage from '../_components/view-page';
import { name_singular } from '../_constant';
import { client } from '@/lib/client';
import { GET_ALL_CATEGORIES } from '@/api/queries';

export const metadata = {
  title: `Dashboard : ${name_singular} View`
};

interface PageProps { params: Promise<{ itemId: string }> };

const getCategories = async () => {
  try {
    const res: any = await client.request(GET_ALL_CATEGORIES);
    return res.getAllCategories;
  } catch (error) {
    return [];
  }
}
export default async function Page({ params }: PageProps) {
  const itemId = (await params).itemId;
  const categories = await getCategories();
  return (
    <div className="flex-1 space-y-4">
      <Suspense fallback={<FormCardSkeleton />}>
        <ViewPage data={categories} itemId={itemId} />
      </Suspense>
    </div>
  );
}
