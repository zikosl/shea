import { Suspense } from "react";

import FormCardSkeleton from "@/components/form-card-skeleton";
import { requestServerGraphQL } from "@/lib/server-request";
import { GET_ALL_BRANDS, GET_ALL_PRODUCT_TYPES } from "@/api/queries";

import ViewPage from "../_components/view-page";
import { name_singular } from "../_constant";

export const metadata = {
  title: `Dashboard : ${name_singular} View`,
};

interface PageProps {
  params: Promise<{ itemId: string }>;
}

async function getReferences() {
  try {
    const [productTypesRes, brandsRes] = await Promise.all([
      requestServerGraphQL<any>(GET_ALL_PRODUCT_TYPES, {
        page: 1,
        limit: 1000,
        isFull: true,
      }),
      requestServerGraphQL<any>(GET_ALL_BRANDS),
    ]);

    return {
      productTypes: productTypesRes.findManyProductTypes.productTypes,
      brands: brandsRes.getAllBrands,
    };
  } catch (_error) {
    return {
      productTypes: [],
      brands: [],
    };
  }
}

export default async function Page({ params }: PageProps) {
  const itemId = (await params).itemId;
  const references = await getReferences();

  return (
    <div className="flex-1 space-y-4">
      <Suspense fallback={<FormCardSkeleton />}>
        <ViewPage references={references} itemId={itemId} />
      </Suspense>
    </div>
  );
}
