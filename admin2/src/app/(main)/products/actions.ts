"use server"
import { client } from "@/lib/client";
import { Item, name_plural, title_plural, title_singular } from "./_constant";
import { CREATE_ITEM, DELETE_ITEM, FIND_MANY_ITEMS, FIND_ONE_ITEM, UPDATE_ITEM } from "./_constant/request";
import { revalidatePath } from "next/cache";

// Create a new item
export const createItem = async (itemData: Partial<Item>) => {
    try {
        const response: any = await client.request(CREATE_ITEM, {
            ...itemData
        });
        response.data = response[`create${title_singular}`];
        return response.data;
    } catch (error) {
        throw new Error(error);
    }
};



// Get a single item by ID
export const getItemById = async (id: string) => {
    try {
        const response: any = await client.request(FIND_ONE_ITEM, {
            id: parseInt(id)
        });
        return response[`findOne${title_singular}`];
    } catch (error) {
        throw new Error(error);
    }
};

export async function getSearchItem({ search, page, limit, isFull = false }: {
    search?: string | undefined,
    page: number,
    limit: number,
    isFull?: boolean
}): Promise<{
    items: any[];
    totalItems: number;
}> {
    const response: any = await client.request(FIND_MANY_ITEMS, {
        search,
        page,
        limit,
        isFull,
    });

    response.data = response[`findMany${title_plural}`]
    const items = response.data[name_plural];
    const totalItems = response.data[`total${title_plural}`];
    return {
        items,
        totalItems,
    };

}

// Update a item by ID
export const updateItem = async (id: string, itemData: Partial<Item>) => {
    try {
        const response: any = await client.request(UPDATE_ITEM, {
            id: parseInt(id),
            ...itemData
        });
        return response[`update${title_singular}`]
    } catch (error) {
        throw new Error(error);
    }
};

// Delete a item by ID
export const deleteItem = async (id: string) => {
    try {
        const response: any = await client.request(DELETE_ITEM, {
            id: parseInt(id),
        });
        revalidatePath(`/${name_plural}`);
        return response[`delete${title_singular}`].id
    } catch (error) {
        throw new Error(error);
    }
};
