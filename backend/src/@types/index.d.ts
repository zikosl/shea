type Partner = {
    id: number
    email: string
    companyName: string
    avatar: string
    password: string
    latitude: number
    longitude: number
    address: string
}

type Address = {
    id: number
    label: string
    address: string
    longitude: number
    latitude: number
    isDefault: boolean
}

type PartnerNiche = {
    id: number;
    partnerId: number;
    niche_id: number
    niche: Niche
}

type Driver = {
    id: number
    email: string
    firstname: string
    lastname: string
    password: string
    latitude: number
    longitude: number
    address: string
}

type Niche = {
    id: number
    name: string
    name_ar: string
    image: string
}

type Category = {
    id: number
    name: string
    name_ar: string
    image: string
    niche_id: number;
    niche: Niche
}

type Brand = {
    id: number
    name: string
    image: string
}

type Product = {
    id: number
    name: string
    image: string
    price: number
    product_type_id: number
    productType: ProductType
    brand_id: number
    partnerId: number
    partner: Partner
    brand: Brand
}

type ProductType = {
    id: number
    name: string
    name_ar: string
    category: Category
    category_id: string
}


type Order = {
    id: number
    clientId: number
    partnerId: number
    delivery: Delivery
    deliveryPrice: number
    items: OrderItem[]
}


type Delivery = {
    addressId: Number
    driverId: Number
    id: Number
    orderId: Number
    price: Number
    status: DeliveryStatus
    type: DeliveryType
}

type OrderDispatch = {
    id: number
    expiresAt: Date
    sentAt: Date
    status: DispatchStatus
    order: Order
}


type OrderItem = {
    id: number
    productId: number
    quantity: DeliveryStatus
    price: number
}

type BatchPayload = {
    count: number;
};

declare enum DeliveryStatus {
    PENDING,
    ACCEPTED,
    READY,
    ASSIGNED,
    PICKED,
    DELIVERED,
    CANCELED
}


declare enum PricingName {
    APP_TAX = "APP_TAX",
    NORMAL_DELIVERY_TAX = "NORMAL_DELIVERY_TAX",
    GROUP_DELIVERY_TAX = "GROUP_DELIVERY_TAX",
    STORE_TAX = "STORE_TAX",
    PICKUP_TAX = "PICKUP_TAX"
}

declare enum DeliveryType {
    PICKUP,
    NORMAL,
    GROUPED
}


declare enum DispatchStatus {
    SENT,
    EXPIRED,
    ACCEPTED,
    REJECTED,
}

declare enum LogSatus {
    ORDER_UPDATE,
    NEW_PRODUCT,
    NEW_PARTNER,
}