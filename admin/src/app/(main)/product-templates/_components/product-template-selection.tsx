"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Item } from "../_constant";

type SelectionContextValue = {
  selectedById: Record<string, Item>;
  setSelected: (item: Item, selected: boolean) => void;
  setManySelected: (items: Item[], selected: boolean) => void;
  clearSelection: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function ProductTemplateSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedById, setSelectedById] = useState<Record<string, Item>>({});

  const setSelected = (item: Item, selected: boolean) => {
    setSelectedById((current) => {
      if (selected) return { ...current, [item.id]: item };
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  };

  const setManySelected = (items: Item[], selected: boolean) => {
    setSelectedById((current) => {
      const next = { ...current };
      for (const item of items) {
        if (selected) next[item.id] = item;
        else delete next[item.id];
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedById({});

  return <SelectionContext.Provider value={{ selectedById, setSelected, setManySelected, clearSelection }}>{children}</SelectionContext.Provider>;
}

export function useProductTemplateSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("Product template selection must be used inside its provider.");
  return context;
}
