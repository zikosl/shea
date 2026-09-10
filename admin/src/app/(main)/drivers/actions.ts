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
import {
  AccountSaveResult,
  getAccountSaveErrorCode,
} from "@/lib/form-errors";

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

const resourceActions = createResourceActions<DriverResponse, Item>({
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

export const {
  createItem,
  getItemById,
  getSearchItem,
  updateItem,
  deleteItem
} = resourceActions;

type DriverAccountInput = Partial<{
  firstname: string;
  lastname: string;
  email: string;
}>;

export async function saveDriverAccount(
  id: string | undefined,
  data: DriverAccountInput,
): Promise<AccountSaveResult<Item>> {
  try {
    const item = id
      ? await resourceActions.updateItem(id, data as Partial<DriverResponse>)
      : await resourceActions.createItem(data as Partial<DriverResponse>);
    return { ok: true, item };
  } catch (error) {
    return { ok: false, code: getAccountSaveErrorCode(error) };
  }
}
