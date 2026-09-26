type Partner = {
    id: string;
    email: string;
    password: string;
    companyName: string;
    primaryColor?: string;
    feeType?: "NONE" | "PERCENTAGE" | "FIXED" | "MIXED";
    feeRate?: number;
    fixedFee?: number;
    driverRequestFee?: number | null;
    niches?: number[];
    partnerNiches?: PartnerNiche[];
    capabilityOverrides?: Record<CapabilityCode, CapabilityOverrideEffect | null>;
}

type CapabilityCode = "CUSTOM_ORDERS" | "QUOTATIONS" | "GIFT_BUILDER" | "GIFT_TEMPLATES" | "PRODUCTION" | "PRODUCTION_TASKS" | "DELIVERY_PICKUP" | "GIFT_GALLERY" | "GIFT_REPORTS";
type CapabilityOverrideEffect = "ENABLE" | "DISABLE";
type BusinessModuleCode = "CUSTOM_SALES" | "GIFT_STUDIO" | "PRODUCTION_WORKFLOW";
type BusinessModuleChoice = "INHERIT" | "ENABLE" | "DISABLE";

type PartnerCapabilityConfig = {
    catalog: CapabilityCode[];
    effective: Array<{ code: CapabilityCode; enabled: boolean; source: "GLOBAL_DEFAULT" | "NICHE_DEFAULT" | "PARTNER_OVERRIDE" }>;
    inherited: Array<{ code: CapabilityCode; enabled: boolean; source: "GLOBAL_DEFAULT" | "NICHE_DEFAULT" }>;
    overrides: Array<{ capability: CapabilityCode; effect: CapabilityOverrideEffect }>;
}

type PartnerNiche = {
    id: string;
    niche_id: number | string;
    niche?: Niche | null;
}

type Driver = {
    id: string;
    email: string;
    password: string;
    firstname: string
    lastname: string
}

type Category = {
    id: string;
    name: string;
    name_ar: string;
    image: string;
    niche_id?: string;
    niche?: Niche | null;
}

type ProductType = {
    id: string;
    name: string;
    name_ar: string;
    category_id: string;
    category: Category;
}

type Niche = {
    id: string;
    name: string;
    name_ar: string;
    image: string;
}

type Brand = {
    id: string;
    name: string;
    name_ar: string;
    image: string;
    niche_id?: string | number | null;
    niche?: Niche | null;
}

type ProductTemplateImage = {
    id?: string;
    url: string;
}

type ProductTemplate = {
    id: string;
    name: string;
    name_ar: string;
    description: string;
    description_ar: string;
    product_type_id?: string;
    brand_id: string;
    category_id?: string;
    niche_id?: string;
    productType?: ProductType | null;
    brand?: Brand | null;
    category?: Category | null;
    niche?: Niche | null;
    images: ProductTemplateImage[];
}

type ProductVariant = {
    id: string;
    name?: string | null;
    name_ar?: string | null;
    description?: string | null;
    description_ar?: string | null;
    sku?: string | null;
    productId: string;
    tags: Array<{ id: string; value: string }>;
    images: ProductTemplateImage[];
    productCount: number;
}

type User = {
    id: string
    email: string
    admin: {
        firstname?: string
        lastname?: string
        birthday?: string
        city?: number
    }
}
