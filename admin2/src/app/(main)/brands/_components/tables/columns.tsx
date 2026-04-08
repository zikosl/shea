'use client';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { Item } from '../../_constant';
import Image from 'next/image';

export const columns: ColumnDef<Item>[] = [

  {
    id: 'image',
    header: 'Image',
    cell: ({ row }) => {
      const loaderProp = ({ src }) => {
        return src;
      }
      return <Image alt="Image" loader={loaderProp} src={process.env.NEXT_PUBLIC_PUBLIC_URL + row.original.image} width={150} height={100} />
    },
    size: 200,
  },
  {
    accessorKey: 'name',
    header: 'Name',
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
