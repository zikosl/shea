"use server";

import { createResourceActions } from "@/lib/resource-actions";

import { Item, link, title_plural, title_singular } from "./_constant";
import {
  CREATE_ITEM,
  DELETE_ITEM,
  FIND_MANY_ITEMS,
  FIND_ONE_ITEM,
  UPDATE_ITEM
} from "./_constant/request";

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem
} = createResourceActions<Item>({
  createMutation: CREATE_ITEM,
  deleteMutation: DELETE_ITEM,
  findManyQuery: FIND_MANY_ITEMS,
  findOneQuery: FIND_ONE_ITEM,
  updateMutation: UPDATE_ITEM,
  singularKey: title_singular,
  pluralKey: title_plural,
  path: link,
});
