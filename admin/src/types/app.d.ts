type Partner = {
    id: string;
    email: string;
    password: string;
    companyName: string
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
    image: string;
}

type ProductTemplateImage = {
    id?: string;
    url: string;
}

type ProductTemplate = {
    id: string;
    name: string;
    description: string;
    product_type_id: string;
    brand_id: string;
    category_id?: string;
    niche_id?: string;
    productType?: ProductType | null;
    brand?: Brand | null;
    category?: Category | null;
    niche?: Niche | null;
    images: ProductTemplateImage[];
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
