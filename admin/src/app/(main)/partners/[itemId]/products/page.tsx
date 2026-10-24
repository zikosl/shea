import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PartnerCatalog from '../../_components/partner-catalog';
import { getItemById } from '../../actions';

export const instant = false;

export const metadata = { title: 'Partner products' };

type PageProps = { params: Promise<{ itemId: string }> };

export default async function PartnerProductsPage({ params }: PageProps) {
  const { itemId } = await params;
  const partner = await getItemById(itemId);
  const partnerId = Number(partner?.userId);
  if (!partner || !Number.isSafeInteger(partnerId) || partnerId < 1) notFound();

  return (
    <div className="flex-1 space-y-5">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`/partners/${itemId}`}><ArrowLeft /> Back to partner</Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">Partner · {partner.companyName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      </div>
      <PartnerCatalog partnerId={partnerId} partnerRouteId={itemId} />
    </div>
  );
}
