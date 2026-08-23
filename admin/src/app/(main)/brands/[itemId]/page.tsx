import { Suspense } from 'react';
import FormCardSkeleton from '@/components/form-card-skeleton';
import ViewPage from '../_components/view-page';
import { name_singular } from '../_constant';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: `Dashboard : ${name_singular} View`
};

interface PageProps { params: Promise<{ itemId: string }> }

export default async function Page({ params }: PageProps) {
  const itemId = (await params).itemId;
  return (
    <div className="flex-1 space-y-4">
      <Suspense fallback={<FormCardSkeleton />}>
        <ViewPage itemId={itemId} />
      </Suspense>
    </div>
  );
}
