'use client';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { Item } from '../../_constant';

export const columns: ColumnDef<Item>[] = [

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
    accessorKey: 'category.name',
    header: 'Category Name',
    size: 200,
  },
  {
    accessorKey: 'category.name_ar',
    header: 'Category Arabic Name',
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
