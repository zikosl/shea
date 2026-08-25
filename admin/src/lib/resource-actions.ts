import { revalidatePath } from "next/cache";
import type { RequestDocument } from "graphql-request";

import { requestServerGraphQL } from "@/lib/server-request";

type SearchParams = {
  search?: string;
  page: number;
  limit: number;
  isFull?: boolean;
};

type ResourceActionConfig<TItem, TMappedItem = TItem> = {
  createMutation: RequestDocument;
  deleteMutation: RequestDocument;
  findManyQuery: RequestDocument;
  findOneQuery: RequestDocument;
  updateMutation: RequestDocument;
  singularKey: string;
  pluralKey: string;
  path: string;
  mapItem?: (item: TItem) => TMappedItem;
};

type SearchResult<TItem> = {
  items: TItem[];
  totalItems: number;
};

function lowerFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

export function createResourceActions<TItem extends { id: number | string }, TMappedItem = TItem>({
  createMutation,
  deleteMutation,
  findManyQuery,
  findOneQuery,
  updateMutation,
  singularKey,
  pluralKey,
  path,
  mapItem,
}: ResourceActionConfig<TItem, TMappedItem>) {
  const mapResult = (item: TItem): TMappedItem =>
    mapItem ? mapItem(item) : (item as unknown as TMappedItem);

  const createKey = `create${singularKey}`;
  const findOneKey = `findOne${singularKey}`;
  const findManyKey = `findMany${pluralKey}`;
  const updateKey = `update${singularKey}`;
  const deleteKey = `delete${singularKey}`;
  const totalKey = `total${pluralKey}`;

  async function createItem(itemData: Partial<TItem>) {
    const response = await requestServerGraphQL<Record<string, TItem>>(createMutation, {
      ...itemData,
    });

    return mapResult(response[createKey]);
  }

  async function getItemById(id: string) {
    const response = await requestServerGraphQL<Record<string, TItem>>(findOneQuery, {
      id: Number.parseInt(id, 10),
    });

    return mapResult(response[findOneKey]);
  }

  async function getSearchItem({
    search,
    page,
    limit,
    isFull = false,
  }: SearchParams): Promise<SearchResult<TMappedItem>> {
    const response = await requestServerGraphQL<Record<string, Record<string, TItem[]> & Record<string, number>>>(
      findManyQuery,
      {
        search,
        page,
        limit,
        isFull,
      },
    );

    const data = response[findManyKey];
    const items = (data[lowerFirst(pluralKey)] ?? []).map(mapResult);
    const totalItems = data[totalKey];

    return {
      items,
      totalItems,
    };
  }

  async function updateItem(id: string, itemData: Partial<TItem>) {
    const response = await requestServerGraphQL<Record<string, TItem>>(updateMutation, {
      id: Number.parseInt(id, 10),
      ...itemData,
    });

    return mapResult(response[updateKey]);
  }

  async function deleteItem(id: string) {
    const response = await requestServerGraphQL<Record<string, { id: number | string }>>(
      deleteMutation,
      {
        id: Number.parseInt(id, 10),
      },
    );

    revalidatePath(`/${path}`);
    return response[deleteKey].id;
  }

  return {
    createItem,
    getItemById,
    getSearchItem,
    updateItem,
    deleteItem,
  };
}
