import { StockDetailPage } from "@/components/views/stock-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StockDetailPage id={Number(id)} />;
}
