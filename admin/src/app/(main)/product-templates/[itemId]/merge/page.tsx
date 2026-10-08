import { notFound } from "next/navigation";

import { getTemplateForMerge } from "../../actions";
import MergeTemplatesManager from "./merge-manager";

export const instant = false;

type Props = { params: Promise<{ itemId: string }> };

export default async function MergeTemplatesPage({ params }: Props) {
  const { itemId } = await params;
  const id = Number(itemId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const target = await getTemplateForMerge(id);
  if (!target) notFound();

  return <MergeTemplatesManager target={target} />;
}
