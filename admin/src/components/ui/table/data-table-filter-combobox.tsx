'use client';

import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Options } from 'nuqs';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DataTableFilterOption = {
  value: string;
  label: string;
  meta?: Record<string, string | null | undefined>;
};

type DataTableFilterComboboxProps = {
  title: string;
  options: DataTableFilterOption[];
  value: string;
  setValue: (
    value: string | ((old: string) => string | null) | null,
    options?: Options
  ) => Promise<URLSearchParams>;
  setPage: <Shallow>(
    value: number | ((old: number) => number | null) | null,
    options?: Options
  ) => Promise<URLSearchParams>;
  disabled?: boolean;
  emptyText?: string;
  onAfterChange?: () => void;
};

export function DataTableFilterCombobox({
  title,
  options,
  value,
  setValue,
  setPage,
  disabled,
  emptyText = 'No options found.',
  onAfterChange
}: DataTableFilterComboboxProps) {
  const [isPending, startTransition] = useTransition();
  const selected = options.find((option) => option.value === value);

  const updateValue = (nextValue: string | null) => {
    setValue(nextValue, { startTransition });
    setPage(1, { startTransition });
    onAfterChange?.();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 min-w-[170px] justify-between rounded-xl border-border bg-background px-3 font-normal',
            !selected && 'text-muted-foreground',
            isPending && 'animate-pulse'
          )}
        >
          <span className="truncate">{selected?.label ?? title}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const active = option.value === value;

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => updateValue(active ? null : option.value)}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 text-primary',
                        active ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected ? (
              <CommandGroup>
                <CommandItem
                  onSelect={() => updateValue(null)}
                  className="justify-center gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear {title.toLowerCase()}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
