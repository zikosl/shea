import Link from 'next/link';
import { CheckCircle2, GitMerge, Layers3, XCircle } from 'lucide-react';

import { ResourcePage } from '@/components/admin-panel/resource-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { approveSubmission, getCatalogSubmissions, rejectSubmission } from './actions';

export const metadata = { title: 'Dashboard: Catalog Inbox' };

export default async function CatalogInboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'PENDING' } = await searchParams;
  const submissions = await getCatalogSubmissions(status);
  return <ResourcePage
    title="Catalog Inbox"
    description="Review each partner contribution as one dependency-aware submission. Pending products remain internal until approved or merged."
    filters={<div className="flex flex-wrap gap-2">{['PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'MERGED', 'REJECTED'].map((item) => <Button key={item} asChild variant={status === item ? 'default' : 'outline'} size="sm"><Link href={`/catalog-inbox?status=${item}`}>{item.replace('_', ' ')}</Link></Button>)}</div>}
  >
    {!submissions.length ? <div className="rounded-2xl bg-muted/40 px-6 py-14 text-center text-muted-foreground">No catalog submissions in this queue.</div> : null}
    <div className="grid gap-4 xl:grid-cols-2">
      {submissions.map((submission) => {
        const pending = [...submission.catalogProposals, ...submission.productRequests].filter((item) => item.status === 'PENDING').length;
        return <Card key={submission.id} className="overflow-hidden">
          <CardHeader className="gap-3 bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle>{submission.title || submission.partner.companyName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{submission.partner.companyName} · {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Draft'}</p></div>
              <Badge variant={submission.status === 'PENDING' ? 'secondary' : 'outline'}>{submission.status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{submission.catalogProposals.length} catalog dependencies</span><span>·</span><span>{submission.productRequests.length} products</span><span>·</span><span>{pending} pending</span></div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              {submission.catalogProposals.map((proposal) => <div key={proposal.id} className="flex items-center justify-between rounded-xl bg-muted/35 px-3 py-2"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{proposal.name}</span><Badge variant="outline">{proposal.entityType.replace('_', ' ')}</Badge></div><Badge variant="outline">{proposal.status}</Badge></div>)}
              {submission.productRequests.map((request) => <div key={request.id} className="rounded-xl bg-muted/35 px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="font-medium">{request.name}</span><Badge variant="outline">{request.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{request.variants.length} variant{request.variants.length === 1 ? '' : 's'} · {request.variants.map((variant) => variant.name || variant.sku || 'Default').join(', ')}</p></div>)}
            </div>
            {pending ? <div className="grid gap-3 sm:grid-cols-2">
              <form action={approveSubmission}><input type="hidden" name="id" value={submission.id} /><Button className="w-full gap-2"><CheckCircle2 className="h-4 w-4" />Approve all as new</Button></form>
              <form action={rejectSubmission} className="flex gap-2"><input type="hidden" name="id" value={submission.id} /><input name="reason" required minLength={3} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" placeholder="Reason" /><Button type="submit" variant="outline" size="icon" title="Reject all"><XCircle className="h-4 w-4" /></Button></form>
            </div> : null}
            <div className="flex flex-wrap gap-2"><Button asChild variant="ghost" size="sm"><Link href="/catalog-requests"><GitMerge className="mr-2 h-4 w-4" />Merge catalog dependencies</Link></Button><Button asChild variant="ghost" size="sm"><Link href="/product-requests">Review product merges</Link></Button></div>
          </CardContent>
        </Card>;
      })}
    </div>
  </ResourcePage>;
}
