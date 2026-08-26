'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, MoreHorizontal, Trash } from 'lucide-react';
import { toast } from 'sonner';

import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { deleteItem } from '../../actions';
import { Item, link } from '../../_constant';

interface CellActionProps {
  data: Item;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const onConfirm = async () => {
    setLoading(true);
    try {
      const response = await deleteItem(data.id);
      if (response) {
        toast.success(`${response} deleted successfully`);
      }
      router.replace(`/${link}`);
    } catch (_error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
          <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuItem className="gap-2 rounded-lg px-2 py-2 text-sm" onClick={() => router.push(`/${link}/${data.id}`)}>
            <Edit className="h-4 w-4" /> Update
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 rounded-lg px-2 py-2 text-sm text-destructive focus:text-destructive" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
