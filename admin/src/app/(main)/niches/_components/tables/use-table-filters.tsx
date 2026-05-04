import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

export function useTableFilters() {
  const [searchQuery, setSearchQuery] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const resetFilters = () => {
    setSearchQuery(null);
    setPage(1);
  };

  const isAnyFilterActive = !!searchQuery;

  return {
    isAnyFilterActive,
    resetFilters,
    searchQuery,
    setPage,
    setSearchQuery,
  };
}
