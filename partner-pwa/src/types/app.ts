export type DeliveryStatus =
  | "PENDING"
  | "ACCEPTED"
  | "READY"
  | "ASSIGNED"
  | "PICKED"
  | "DELIVERED"
  | "CANCELED";

export type DeliveryType = "PICKUP" | "NORMAL" | "GROUPED";

export type Brand = {
  id: number;
  name: string;
  image?: string | null;
};

export type Niche = {
  id: number;
  name: string;
  name_ar?: string | null;
  image?: string | null;
};

export type Category = {
  id: number;
  niche_id: number;
  name: string;
  name_ar?: string | null;
  productTypes?: { totalProductTypes?: number }[] | null;
};

export type ProductType = {
  id: number;
  category_id: number;
  name: string;
  name_ar?: string | null;
  products?: { totalProductTemplates?: number }[] | null;
};

export type ProductImage = {
  id?: number;
  url: string;
};

export type Variant = {
  id: number;
  name: string;
  sku?: string | null;
  image?: string | null;
};

export type ProductTemplate = {
  id: number;
  name: string;
  description?: string | null;
  name_ar?: string | null;
  product_type_id?: number | null;
  category_id?: number | null;
  niche_id?: number | null;
  brand_id?: number | null;
  brand?: Brand | null;
  productType?: ProductType | null;
  category?: Category | null;
  niche?: Niche | null;
  images: ProductImage[];
  variants: Variant[];
};

export type Product = {
  id: number;
  name: string;
  name_ar?: string | null;
  sku?: string | null;
  variantName?: string | null;
  price: number;
  stock?: number | null;
  available: boolean;
  variantId?: number | null;
  product_template_id?: number | null;
  product_type_id?: number | null;
  category_id?: number | null;
  brand_id?: number | null;
  brand?: Brand | null;
  productType?: ProductType | null;
  category?: Category | null;
  images: ProductImage[];
};

export type OrderClient = {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
  avatar?: string | null;
  user?: {
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type OrderItem = {
  quantity: number;
  price: number;
  product?: {
    id?: number | null;
    name?: string | null;
    sku?: string | null;
    image?: ProductImage | null;
    images?: ProductImage[] | null;
  } | null;
};

export type Delivery = {
  id: number;
  type: DeliveryType;
  status: DeliveryStatus;
};

export type Order = {
  id: number;
  date: string;
  source?: string | null;
  walkInCustomerName?: string | null;
  note?: string | null;
  paymentMethod?: string | null;
  discount?: number | null;
  client?: OrderClient | null;
  delivery?: Delivery | null;
  items: OrderItem[];
};

export type PartnerProfile = {
  id: number;
  userId: number;
  companyName: string;
  avatar?: string | null;
  email: string;
  online: boolean;
  longitude?: number | null;
  latitude?: number | null;
  address?: string | null;
};

export type AuthUser = {
  id: number;
  email: string;
  phone?: string | null;
  partner: {
    id: number;
    companyName: string;
    online: boolean;
    avatar?: string | null;
    longitude?: number | null;
    latitude?: number | null;
    address?: string | null;
  };
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
  accessTokenExpires: string;
  user: AuthUser;
};

export type ProductFilterState = {
  search: string;
  nicheId: number | null;
  categoryId: number | null;
  productTypeId: number | null;
  brandId: number | null;
};

export type VariantPriceDraft = {
  variantId: number;
  price: number;
  stock?: number;
  available?: boolean;
};

export type ProfileInput = {
  companyName?: string;
  avatar?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  address?: string | null;
  online?: boolean;
};

export type OfflineMutation =
  | { id: string; kind: "orderStatus"; payload: { id: number; status: DeliveryStatus }; createdAt: string }
  | { id: string; kind: "publishVariants"; payload: { items: VariantPriceDraft[] }; createdAt: string }
  | { id: string; kind: "productUpdate"; payload: { id: number; input: { price?: number; stock?: number; available?: boolean } }; createdAt: string }
  | { id: string; kind: "productDelete"; payload: { id: number }; createdAt: string }
  | { id: string; kind: "profileUpdate"; payload: ProfileInput; createdAt: string }
  | {
      id: string;
      kind: "posCheckout";
      payload: {
        localTicketId: string;
        customerName?: string;
        note?: string;
        discount: number;
        paymentMethod: PosPaymentMethod;
        items: PosCartLine[];
      };
      createdAt: string;
    };

export type PosPaymentMethod = "cash" | "card" | "transfer";

export type PosTicketStatus = "draft" | "completed" | "canceled";

export type PosCartLine = {
  productId: number;
  name: string;
  sku?: string | null;
  image?: string | null;
  price: number;
  quantity: number;
  stock?: number | null;
};

export type PosTicket = {
  id: string;
  createdAt: string;
  status: PosTicketStatus;
  syncStatus?: "local" | "synced";
  serverOrderId?: number;
  customerName?: string;
  note?: string;
  paymentMethod: PosPaymentMethod;
  discount: number;
  subtotal: number;
  total: number;
  lines: PosCartLine[];
};
