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

type Brand = {
    id: string;
    name: string;
    image: string;
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