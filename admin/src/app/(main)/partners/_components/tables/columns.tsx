'use client';
import { ColumnDef } from '@tanstack/react-table';
import { CellAction } from './cell-action';
import { Item } from '../../_constant';
import { Badge } from '@/components/ui/badge';

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
    accessorKey: 'partnerNiches',
    header: 'Niches',
    cell: ({ row }) => {
      const partnerNiches = row.original.partnerNiches ?? [];

      if (!partnerNiches.length) {
        return <span className="text-sm text-muted-foreground">No niches</span>;
      }

      return (
        <div className="flex flex-wrap gap-1.5">
          {partnerNiches.slice(0, 2).map((item) => (
            <Badge key={item.id} variant="outline" className="rounded-full">
              {item.niche?.name ?? `Niche #${item.niche_id}`}
            </Badge>
          ))}
          {partnerNiches.length > 2 ? (
            <Badge variant="secondary" className="rounded-full">
              +{partnerNiches.length - 2}
            </Badge>
          ) : null}
        </div>
      );
    },
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
