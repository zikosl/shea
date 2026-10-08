'use client';

import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

import { resolvePublicAssetUrl } from '@/constant';
import { Item } from '../../_constant';
import { CellAction } from './cell-action';

export const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Template',
    cell: ({ row }) => {
      const imageUrl = row.original.images?.[0]?.url;
      return <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
          {imageUrl ? <Image unoptimized fill sizes="40px" src={resolvePublicAssetUrl(imageUrl)} alt="" className="object-cover" /> : <span className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-4 w-4" /></span>}
        </div>
        <div className="min-w-0"><p className="truncate font-medium">{row.original.name}</p>{row.original.name_ar ? <p dir="rtl" className="truncate text-xs text-muted-foreground">{row.original.name_ar}</p> : null}</div>
      </div>;
    },
    size: 260,
  },
  {
    accessorKey: 'productType.name',
    header: 'Product Type',
    size: 180,
  },
  {
    accessorKey: 'brand.name',
    header: 'Brand',
    size: 180,
  },
  {
    accessorKey: 'category.name',
    header: 'Category',
    size: 180,
  },
  {
    accessorKey: 'variantCount',
    header: 'Variants',
    cell: ({ row }) => <span className="tabular-nums">{row.original.variantCount ?? 0}</span>,
    size: 90,
  },
  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />,
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false
  }
];
