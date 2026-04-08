'use client';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { Item } from '../../_constant';

export const columns: ColumnDef<Item>[] = [

  {
    accessorKey: 'companyName',
    header: 'Company Name',
    size: 200,
  },
  {
    accessorKey: 'email',
    header: 'Email',
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
