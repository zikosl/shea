import { notFound } from "next/navigation";

import { getItemById } from "../../actions";
import { getVariants } from "./actions";
import VariantsManager from "./variants-manager";

export const instant = false;

type Props = {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function VariantPage({ params, searchParams }: Props) {
  const { itemId } = await params;
  const query = await searchParams;
  const productId = Number(itemId);
  if (!Number.isInteger(productId)) notFound();

  const product = await getItemById(itemId);
  if (!product) notFound();

  const page = Math.max(1, Number(query.page) || 1);
  const limit = 20;
  const result = await getVariants(productId, query.search?.trim() ?? "", page, limit);

  return <VariantsManager productId={productId} productName={product.name} variants={result.variants} total={result.total} page={page} limit={limit} search={query.search ?? ""} />;
}
