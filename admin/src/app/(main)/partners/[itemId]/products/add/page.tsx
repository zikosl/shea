import { notFound } from 'next/navigation';
import PartnerCatalogAdd from '../../../_components/partner-catalog-add';
import { getItemById } from '../../../actions';

export const instant = false;
export const metadata = { title: 'Add partner products' };

type PageProps = { params: Promise<{ itemId: string }> };

export default async function AddPartnerProductsPage({ params }: PageProps) {
  const { itemId } = await params;
  const partner = await getItemById(itemId);
  const partnerId = Number(partner?.userId);
  if (!partner || !Number.isSafeInteger(partnerId) || partnerId < 1) notFound();

  return <PartnerCatalogAdd partnerId={partnerId} partnerRouteId={itemId} partnerName={partner.companyName} />;
}
