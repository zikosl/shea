'use client';

import { ColumnDef } from '@tanstack/react-table';

import { Item } from '../../_constant';
import { CellAction } from './cell-action';

export const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    size: 220,
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
    id: 'images',
    header: 'Images',
    cell: ({ row }) => row.original.images.length,
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
