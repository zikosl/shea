'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ItemForm from './form';
import PartnerCatalog from './partner-catalog';

export default function PartnerProfileTabs({
  initialData,
  niches,
  capabilities,
  pageTitle,
}: {
  initialData: Partner;
  niches: Niche[];
  capabilities: PartnerCapabilityConfig;
  pageTitle: string;
}) {
  const partnerId = Number(initialData.userId);

  return (
    <Tabs defaultValue="profile" className="space-y-5">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="profile">Partner profile</TabsTrigger>
        <TabsTrigger value="catalog">Products & pricing</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ItemForm initialData={initialData} niches={niches} capabilities={capabilities} pageTitle={pageTitle} />
      </TabsContent>
      <TabsContent value="catalog">
        {Number.isSafeInteger(partnerId) && partnerId > 0
          ? <PartnerCatalog partnerId={partnerId} />
          : <p className="rounded-xl border p-6 text-sm text-destructive">This partner is missing a valid account link, so its catalog cannot be edited.</p>}
      </TabsContent>
    </Tabs>
  );
}
