import { Suspense } from 'react';
import FormCardSkeleton from '@/components/form-card-skeleton';
import ViewPage from '../_components/view-page';
import { name_singular } from '../_constant';
import { requestServerGraphQL } from '@/lib/server-request';
import { GET_ALL_CATEGORIES } from '@/api/queries';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: `Dashboard : ${name_singular} View`
};

interface PageProps { params: Promise<{ itemId: string }> }

const getCategories = async () => {
  try {
    const res: any = await requestServerGraphQL(GET_ALL_CATEGORIES);
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
