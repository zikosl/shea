'use client';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { Item } from '../../_constant';
import Image from 'next/image';
import { resolvePublicAssetUrl } from '@/constant';

export const columns: ColumnDef<Item>[] = [

  {
    id: 'image',
    header: 'Image',
    cell: ({ row }) => (
      <div className="flex h-14 w-20 items-center justify-center rounded-2xl border border-border/70 bg-white p-2 shadow-sm dark:border-slate-400/12 dark:bg-white/6">
        <Image
          alt={`${row.original.name} logo`}
          unoptimized
          src={resolvePublicAssetUrl(row.original.image)}
          width={96}
          height={56}
          className="max-h-10 w-auto object-contain"
        />
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    id: 'niche',
    header: 'Niche',
    cell: ({ row }) => row.original.niche?.name ?? 'Unassigned',
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
