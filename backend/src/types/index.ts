export enum DeliveryStatus {
    PENDING,
    ACCEPTED,
    READY,
    ASSIGNED,
    PICKED,
    DELIVERED,
    CANCELED
}
export enum PricingName {
    APP_TAX = "APP_TAX",
    NORMAL_DELIVERY_TAX = "NORMAL_DELIVERY_TAX",
    GROUP_DELIVERY_TAX = "GROUP_DELIVERY_TAX",
    STORE_TAX = "STORE_TAX",
    PICKUP_TAX = "PICKUP_TAX"
}

export enum DeliveryType {
    PICKUP,
    NORMAL,
    GROUPED
}


export enum DispatchStatus {
    SENT,
    EXPIRED,
    ACCEPTED,
    REJECTED,
}


export enum LogSatus {
    ORDER_UPDATE,
    NEW_PRODUCT,
    NEW_PARTNER,
}