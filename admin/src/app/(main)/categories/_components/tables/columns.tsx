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
    cell: ({ row }) => {
      const imageUrl = resolvePublicAssetUrl(row.original.image);

      if (!imageUrl) {
        return (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            No image
          </div>
        );
      }

      return (
        <Image
          alt={row.original.name ? `${row.original.name} category` : "Category image"}
          unoptimized
          src={imageUrl}
          width={150}
          height={100}
          className="h-16 w-24 rounded-md object-cover"
        />
      );
    },
    size: 200,
  },
  {
    accessorKey: 'niche.name',
    header: 'Niche',
    size: 160,
    cell: ({ row }) => row.original.niche?.name ?? (
      <span className="text-muted-foreground">Unassigned</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    size: 200,
  },
  {
    accessorKey: 'name_ar',
    header: 'Arabic Name',
    size: 200,
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
