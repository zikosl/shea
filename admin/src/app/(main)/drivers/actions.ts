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

type DriverResponse = {
  id: string;
  firstname: string;
  lastname: string;
  user: {
    email: string;
    password: string;
  };
};

const mapDriver = (data: DriverResponse) =>
  data
    ? {
        id: data.id,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.user.email,
        password: data.user.password,
      }
    : null;

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem
} = createResourceActions<DriverResponse, Item>({
  createMutation: CREATE_ITEM,
  deleteMutation: DELETE_ITEM,
  findManyQuery: FIND_MANY_ITEMS,
  findOneQuery: FIND_ONE_ITEM,
  updateMutation: UPDATE_ITEM,
  singularKey: title_singular,
  pluralKey: title_plural,
  path: link,
  mapItem: mapDriver,
});
