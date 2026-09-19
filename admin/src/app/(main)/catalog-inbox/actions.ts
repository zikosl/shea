"use server";

import { revalidatePath } from 'next/cache';
import { ADMIN_CATALOG_SUBMISSIONS } from '@/api/queries/catalog-submission';
import { APPROVE_CATALOG_PROPOSAL, REJECT_CATALOG_PROPOSAL } from '@/api/mutations/catalog-proposal';
import { APPROVE_PRODUCT_TEMPLATE_REQUEST, REJECT_PRODUCT_TEMPLATE_REQUEST } from '@/api/mutations/product-template-request';
import { requestServerGraphQL } from '@/lib/server-request';

export type CatalogSubmissionItem = {
  id: string;
  title?: string | null;
  status: string;
  submittedAt?: string | null;
  createdAt: string;
  partner: { companyName: string; user?: { email?: string | null } | null };
  catalogProposals: Array<{ id: string; entityType: 'CATEGORY' | 'PRODUCT_TYPE'; status: string; name: string; name_ar?: string; nicheId: number; categoryId?: number | null; parentProposalId?: string | null; rejectionReason?: string | null }>;
  productRequests: Array<{ id: number; name: string; name_ar?: string; status: string; rejectionReason?: string | null; variants: Array<{ id: number; name?: string | null; sku?: string | null; price?: number | null; stock?: number | null; tags?: string[] }> }>;
};

export async function getCatalogSubmissions(status = 'PENDING') {
  const response = await requestServerGraphQL<{ adminCatalogSubmissions: CatalogSubmissionItem[] }>(ADMIN_CATALOG_SUBMISSIONS, { status: status || undefined });
  return response.adminCatalogSubmissions;
}

export async function approveSubmission(formData: FormData) {
  const id = String(formData.get('id'));
  const submissions = await getCatalogSubmissions('');
  const submission = submissions.find((item) => item.id === id);
  if (!submission) throw new Error('Catalog submission not found');

  const pendingProposals = submission.catalogProposals.filter((item) => item.status === 'PENDING');
  for (const proposal of pendingProposals.filter((item) => item.entityType === 'CATEGORY')) {
    await requestServerGraphQL(APPROVE_CATALOG_PROPOSAL, { id: proposal.id, adminNote: 'Approved with catalog submission' });
  }
  for (const proposal of pendingProposals.filter((item) => item.entityType === 'PRODUCT_TYPE')) {
    await requestServerGraphQL(APPROVE_CATALOG_PROPOSAL, { id: proposal.id, adminNote: 'Approved with catalog submission' });
  }
  for (const request of submission.productRequests.filter((item) => item.status === 'PENDING')) {
    await requestServerGraphQL(APPROVE_PRODUCT_TEMPLATE_REQUEST, { id: request.id, adminNote: 'Approved with catalog submission' });
  }
  revalidatePath('/catalog-inbox');
}

export async function rejectSubmission(formData: FormData) {
  const id = String(formData.get('id'));
  const reason = String(formData.get('reason') || '').trim();
  if (reason.length < 3) throw new Error('A clear rejection reason is required');
  const submissions = await getCatalogSubmissions('');
  const submission = submissions.find((item) => item.id === id);
  if (!submission) throw new Error('Catalog submission not found');
  for (const proposal of submission.catalogProposals.filter((item) => item.status === 'PENDING')) {
    await requestServerGraphQL(REJECT_CATALOG_PROPOSAL, { id: proposal.id, rejectionReason: reason });
  }
  for (const request of submission.productRequests.filter((item) => item.status === 'PENDING')) {
    await requestServerGraphQL(REJECT_PRODUCT_TEMPLATE_REQUEST, { id: request.id, rejectionReason: reason });
  }
  revalidatePath('/catalog-inbox');
}
