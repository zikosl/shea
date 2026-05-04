import { GraphQLClient, gql } from "graphql-request";

import { env } from "@/lib/env";
import type {
  AuthPayload,
  Brand,
  Category,
  DeliveryStatus,
  Niche,
  Order,
  PartnerProfile,
  PosCartLine,
  Product,
  ProductFilterState,
  ProductTemplate,
  ProductType,
  ProfileInput,
  VariantPriceDraft,
} from "@/types/app";

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const SIGN_IN = gql`
  mutation signIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      user {
        id
        email
        phone
        partner {
          id
          companyName
          online
          avatar
          longitude
          latitude
          address
        }
      }
      accessToken
      accessTokenExpires
      refreshToken
      tokenId
    }
  }
`;

const REFRESH_TOKEN = gql`
  mutation refreshToken($data: String!) {
    refreshToken(data: $data) {
      user {
        id
        email
        phone
        partner {
          id
          companyName
          online
          avatar
          longitude
          latitude
          address
        }
      }
      accessToken
      accessTokenExpires
      refreshToken
      tokenId
    }
  }
`;

const LOGOUT = gql`
  mutation logout {
    logout
  }
`;

const UPDATE_PROFILE = gql`
  mutation updatePartnerProfile(
    $companyName: String
    $avatar: String
    $longitude: Float
    $latitude: Float
    $address: String
    $online: Boolean
  ) {
    updatePartnerProfile(
      companyName: $companyName
      avatar: $avatar
      longitude: $longitude
      latitude: $latitude
      address: $address
      online: $online
    ) {
      user {
        id
        email
        phone
        partner {
          id
          companyName
          online
          avatar
          longitude
          latitude
          address
        }
      }
      accessToken
      accessTokenExpires
      refreshToken
      tokenId
    }
  }
`;

const FIND_MANY_PARTNER_NICHES = gql`
  query findManyPartnerNiches {
    findManyPartnerNiches {
      niche {
        id
        name
        name_ar
        image
      }
    }
  }
`;

const FIND_MANY_CATEGORIES = gql`
  query findManyCategories($niche_id: Int!, $search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyCategories(niche_id: $niche_id, search: $search, page: $page, limit: $limit, isFull: $isFull) {
      categories {
        id
        niche_id
        name
        name_ar
        productTypes {
          totalProductTypes
        }
      }
      totalCategories
    }
  }
`;

const GET_ALL_BRANDS = gql`
  query getAllBrands {
    getAllBrands {
      id
      name
      image
    }
  }
`;

const FIND_MANY_PRODUCT_TYPES = gql`
  query findManyProductTypes($category_id: Int, $search: String, $page: Int!, $limit: Int!, $isFull: Boolean) {
    findManyProductTypes(category_id: $category_id, search: $search, page: $page, limit: $limit, isFull: $isFull) {
      productTypes {
        id
        category_id
        name
        name_ar
        products {
          totalProductTemplates
        }
      }
      totalProductTypes
    }
  }
`;

const FIND_MANY_PRODUCTS = gql`
  query findManyProducts(
    $category_id: Int
    $brand_id: Int
    $product_type_id: Int
    $search: String
    $page: Int!
    $limit: Int!
    $isFull: Boolean
  ) {
    findManyProducts(
      search: $search
      page: $page
      limit: $limit
      isFull: $isFull
      product_type_id: $product_type_id
      category_id: $category_id
      brand_id: $brand_id
    ) {
      products {
        id
        name
        name_ar
        sku
        variantName
        price
        stock
        available
        partnerId
        product_template_id
        variantId
        product_type_id
        brand_id
        category_id
        images {
          id
          url
        }
        brand {
          id
          name
          image
        }
        category {
          id
          niche_id
          name
          name_ar
        }
        productType {
          id
          category_id
          name
          name_ar
        }
      }
      totalProducts
    }
  }
`;

const FIND_MANY_PRODUCT_TEMPLATES = gql`
  query findManyProductTemplates(
    $brand_id: Int
    $product_type_id: Int
    $category_id: Int
    $niche_id: Int
    $search: String
    $page: Int!
    $limit: Int!
    $isFull: Boolean
  ) {
    findManyProductTemplates(
      brand_id: $brand_id
      product_type_id: $product_type_id
      category_id: $category_id
      niche_id: $niche_id
      search: $search
      page: $page
      limit: $limit
      isFull: $isFull
    ) {
      productTemplates {
        id
        name
        name_ar
        description
        product_type_id
        category_id
        niche_id
        brand_id
        images {
          id
          url
        }
        brand {
          id
          name
          image
        }
        niche {
          id
          name
          name_ar
          image
        }
        category {
          id
          niche_id
          name
          name_ar
        }
        productType {
          id
          category_id
          name
          name_ar
        }
        variants {
          id
          name
          sku
          image
        }
      }
      totalProductTemplates
    }
  }
`;

const LIST_ORDERS = gql`
  query listOrders {
    listOrders {
      id
      date
      source
      walkInCustomerName
      note
      paymentMethod
      discount
      client {
        id
        firstname
        lastname
        avatar
        user {
          email
          phone
        }
      }
      delivery {
        id
        type
        status
      }
      items {
        quantity
        price
        product {
          name
          image {
            url
          }
        }
      }
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation partnerOrder($id: Int!, $status: DeliveryStatus!) {
    partnerOrder(id: $id, status: $status) {
      id
      date
      delivery {
        id
        type
        status
      }
    }
  }
`;

const LIST_PARTNER_POS_ORDERS = gql`
  query listPartnerPosOrders {
    listPartnerPosOrders {
      id
      date
      source
      walkInCustomerName
      note
      paymentMethod
      discount
      client {
        id
        firstname
        lastname
      }
      delivery {
        id
        type
        status
      }
      items {
        quantity
        price
        product {
          id
          name
          sku
          images {
            id
            url
          }
        }
      }
    }
  }
`;

const CREATE_PARTNER_POS_ORDER = gql`
  mutation createPartnerPosOrder($data: PartnerPosOrderInput!) {
    createPartnerPosOrder(data: $data) {
      id
      date
      source
      walkInCustomerName
      note
      paymentMethod
      discount
      client {
        id
        firstname
        lastname
      }
      delivery {
        id
        type
        status
      }
      items {
        quantity
        price
        product {
          id
          name
          sku
          images {
            id
            url
          }
        }
      }
    }
  }
`;

const CREATE_MANY_PRODUCTS = gql`
  mutation createManyProducts($data: [InputProductVariant]) {
    createManyProducts(data: $data)
  }
`;

const UPDATE_PRODUCT = gql`
  mutation updateProduct($id: Int!, $price: Float, $available: Boolean, $stock: Int) {
    updateProduct(id: $id, price: $price, available: $available, stock: $stock) {
      id
      name
      sku
      variantName
      stock
      price
      available
      product_type_id
      brand_id
      category_id
      images {
        id
        url
      }
      brand {
        id
        name
        image
      }
      productType {
        id
        category_id
        name
        name_ar
      }
      category {
        id
        niche_id
        name
        name_ar
      }
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation deleteProduct($id: Int!) {
    deleteProduct(id: $id) {
      id
    }
  }
`;

const FILE_UPLOAD = gql`
  mutation uploadFile($file: File!) {
    uploadFile(file: $file) {
      url
      filename
    }
  }
`;

const client = new GraphQLClient(env.graphqlUrl);

function parseError(error: any): ApiError {
  const status = error?.response?.status;
  const message =
    error?.response?.errors?.[0]?.message ||
    error?.message ||
    "Something went wrong while contacting Shea.";

  return new ApiError(message, status);
}

export async function requestGraphQL<T>(query: string, variables?: object, accessToken?: string) {
  try {
    return await client.request<T>(query, variables, accessToken ? { authorization: `Bearer ${accessToken}` } : undefined);
  } catch (error) {
    throw parseError(error);
  }
}

export async function signInPartner(email: string, password: string) {
  const response = await requestGraphQL<{ signIn: AuthPayload }>(SIGN_IN, { email, password });
  return response.signIn;
}

export async function refreshPartnerSession(refreshToken: string) {
  const response = await requestGraphQL<{ refreshToken: AuthPayload }>(REFRESH_TOKEN, { data: refreshToken });
  return response.refreshToken;
}

export async function logoutPartner(accessToken?: string) {
  await requestGraphQL<{ logout: boolean }>(LOGOUT, undefined, accessToken);
}

export async function updatePartnerProfile(accessToken: string, input: ProfileInput) {
  const response = await requestGraphQL<{ updatePartnerProfile: AuthPayload }>(UPDATE_PROFILE, input, accessToken);
  return response.updatePartnerProfile;
}

export async function fetchPartnerNiches(accessToken: string) {
  const response = await requestGraphQL<{ findManyPartnerNiches: { niche: Niche }[] }>(
    FIND_MANY_PARTNER_NICHES,
    undefined,
    accessToken,
  );
  return response.findManyPartnerNiches.map((entry) => entry.niche);
}

export async function fetchCategories(accessToken: string, nicheId: number) {
  const response = await requestGraphQL<{ findManyCategories: { categories: Category[] } }>(
    FIND_MANY_CATEGORIES,
    { niche_id: nicheId, page: 1, limit: 100, isFull: true, search: "" },
    accessToken,
  );
  return response.findManyCategories.categories;
}

export async function fetchBrands(accessToken: string) {
  const response = await requestGraphQL<{ getAllBrands: Brand[] }>(GET_ALL_BRANDS, undefined, accessToken);
  return response.getAllBrands;
}

export async function fetchProductTypes(accessToken: string, categoryId?: number | null) {
  const response = await requestGraphQL<{ findManyProductTypes: { productTypes: ProductType[] } }>(
    FIND_MANY_PRODUCT_TYPES,
    { category_id: categoryId || undefined, page: 1, limit: 100, isFull: true, search: "" },
    accessToken,
  );
  return response.findManyProductTypes.productTypes;
}

export async function fetchProducts(accessToken: string, filters: ProductFilterState) {
  const response = await requestGraphQL<{ findManyProducts: { products: Product[] } }>(
    FIND_MANY_PRODUCTS,
    {
      search: filters.search || undefined,
      page: 1,
      limit: 100,
      isFull: true,
      category_id: filters.categoryId || undefined,
      product_type_id: filters.productTypeId || undefined,
      brand_id: filters.brandId || undefined,
    },
    accessToken,
  );
  return response.findManyProducts.products;
}

export async function fetchProductTemplates(accessToken: string, filters: ProductFilterState) {
  const response = await requestGraphQL<{ findManyProductTemplates: { productTemplates: ProductTemplate[] } }>(
    FIND_MANY_PRODUCT_TEMPLATES,
    {
      search: filters.search || undefined,
      page: 1,
      limit: 100,
      isFull: true,
      niche_id: filters.nicheId || undefined,
      category_id: filters.categoryId || undefined,
      product_type_id: filters.productTypeId || undefined,
      brand_id: filters.brandId || undefined,
    },
    accessToken,
  );
  return response.findManyProductTemplates.productTemplates;
}

export async function fetchOrders(accessToken: string) {
  const response = await requestGraphQL<{ listOrders: Order[] }>(LIST_ORDERS, undefined, accessToken);
  return response.listOrders;
}

export async function fetchPartnerPosOrders(accessToken: string) {
  const response = await requestGraphQL<{ listPartnerPosOrders: Order[] }>(LIST_PARTNER_POS_ORDERS, undefined, accessToken);
  return response.listPartnerPosOrders;
}

export async function updateOrderStatus(accessToken: string, id: number, status: DeliveryStatus) {
  const response = await requestGraphQL<{ partnerOrder: Pick<Order, "id" | "date" | "delivery"> }>(
    UPDATE_ORDER_STATUS,
    { id, status },
    accessToken,
  );
  return response.partnerOrder;
}

export async function createPartnerPosOrder(
  accessToken: string,
  input: {
    customerName?: string;
    note?: string;
    discount: number;
    paymentMethod: string;
    items: PosCartLine[];
  },
) {
  const response = await requestGraphQL<{ createPartnerPosOrder: Order }>(
    CREATE_PARTNER_POS_ORDER,
    {
      data: {
        customerName: input.customerName,
        note: input.note,
        discount: input.discount,
        paymentMethod: input.paymentMethod,
        items: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    accessToken,
  );

  return response.createPartnerPosOrder;
}

export async function publishVariants(accessToken: string, items: VariantPriceDraft[]) {
  await requestGraphQL<{ createManyProducts: boolean }>(CREATE_MANY_PRODUCTS, { data: items }, accessToken);
}

export async function updateProduct(accessToken: string, id: number, input: { price?: number; stock?: number; available?: boolean }) {
  const response = await requestGraphQL<{ updateProduct: Product }>(UPDATE_PRODUCT, { id, ...input }, accessToken);
  return response.updateProduct;
}

export async function deleteProduct(accessToken: string, id: number) {
  await requestGraphQL<{ deleteProduct: { id: number } }>(DELETE_PRODUCT, { id }, accessToken);
}

function dataUrlToFile(dataUrl: string, fallbackName: string) {
  const [meta, content] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fallbackName, { type: mime });
}

export async function uploadFile(accessToken: string | undefined, input: File | string) {
  const file = typeof input === "string" ? dataUrlToFile(input, `upload-${Date.now()}.png`) : input;
  const formData = new FormData();
  formData.append(
    "operations",
    JSON.stringify({
      query: FILE_UPLOAD,
      variables: {
        file: null,
      },
    }),
  );
  formData.append("map", JSON.stringify({ 0: ["variables.file"] }));
  formData.append("0", file);

  const response = await fetch(env.graphqlUrl, {
    method: "POST",
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  const json = await response.json();

  if (!response.ok || json.errors?.length) {
    throw new ApiError(json.errors?.[0]?.message || "File upload failed", response.status);
  }

  return json.data.uploadFile.url as string;
}

export function toPartnerProfile(payload: AuthPayload): PartnerProfile {
  return {
    id: payload.user.partner.id,
    userId: payload.user.id,
    companyName: payload.user.partner.companyName,
    avatar: payload.user.partner.avatar,
    email: payload.user.email,
    online: payload.user.partner.online,
    longitude: payload.user.partner.longitude,
    latitude: payload.user.partner.latitude,
    address: payload.user.partner.address,
  };
}
