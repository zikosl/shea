import { enumType, objectType, inputObjectType } from 'nexus';

export const PricingNameEnum = enumType({
    name: 'PricingName',
    members: [
        'APP_TAX',
        'NORMAL_DELIVERY_TAX',
        'GROUP_DELIVERY_TAX',
        'STORE_TAX',
        'PICKUP_TAX',
    ],
});


export const Platform = enumType({
    name: 'Platform',
    members: ['ANDROID', 'IOS', 'WEB', 'DESKTOP'],
});

export const PartnerFeeType = enumType({
    name: 'PartnerFeeType',
    members: ['NONE', 'PERCENTAGE', 'FIXED', 'MIXED'],
});


export const Pricing = objectType({
    name: 'Pricing',
    definition(t) {
        t.nonNull.int('id');
        t.nonNull.field('name', {
            type: 'PricingName',
        });
        t.nonNull.int('price');
    },
});

export const PartnerDeliverySchedule = objectType({
    name: 'PartnerDeliverySchedule',
    definition(t) {
        t.nonNull.int('id');

        t.nonNull.string('time'); // "17:00"

        t.nonNull.boolean('isActive');
        t.nonNull.field('createdAt', { type: 'DateTime' });
    },
});


export const PricingInput = inputObjectType({
    name: 'PricingInput',
    definition(t) {
        t.nonNull.field('name', { type: 'PricingName' });
        t.nonNull.int('price');
    },
});


export const PartnerDeliveryScheduleInput = inputObjectType({
    name: 'PartnerDeliveryScheduleInput',
    definition(t) {
        t.nonNull.string('time');
        t.boolean('isActive');
    },
});

export const AdminDashboardWindowStats = objectType({
    name: 'AdminDashboardWindowStats',
    definition(t) {
        t.nonNull.int('orders');
        t.nonNull.float('grossRevenue');
        t.nonNull.float('partnerFees');
        t.nonNull.float('netRevenue');
        t.nonNull.float('averageOrderValue');
    },
});

export const AdminDashboardTrendPoint = objectType({
    name: 'AdminDashboardTrendPoint',
    definition(t) {
        t.nonNull.string('label');
        t.nonNull.int('orders');
        t.nonNull.float('revenue');
    },
});

export const AdminDashboardMetric = objectType({
    name: 'AdminDashboardMetric',
    definition(t) {
        t.nonNull.string('id');
        t.nonNull.string('name');
        t.nonNull.int('count');
        t.float('value');
    },
});

export const AdminDashboardRecentOrder = objectType({
    name: 'AdminDashboardRecentOrder',
    definition(t) {
        t.nonNull.int('id');
        t.nonNull.string('date');
        t.nonNull.float('total');
        t.nonNull.string('source');
        t.string('partnerName');
        t.string('clientName');
    },
});

export const AdminDashboardStats = objectType({
    name: 'AdminDashboardStats',
    definition(t) {
        t.nonNull.field('today', { type: AdminDashboardWindowStats });
        t.nonNull.field('week', { type: AdminDashboardWindowStats });
        t.nonNull.field('month', { type: AdminDashboardWindowStats });
        t.nonNull.int('totalOrders');
        t.nonNull.int('pendingDeliveries');
        t.nonNull.int('completedDeliveries');
        t.nonNull.int('canceledDeliveries');
        t.nonNull.int('clientsCount');
        t.nonNull.int('partnersCount');
        t.nonNull.int('activePartners');
        t.nonNull.int('driversCount');
        t.nonNull.int('activeDrivers');
        t.nonNull.int('nichesCount');
        t.nonNull.int('categoriesCount');
        t.nonNull.int('productTemplatesCount');
        t.nonNull.int('productsCount');
        t.nonNull.int('lowStockProducts');
        t.nonNull.int('outOfStockProducts');
        t.nonNull.int('pendingProductRequests');
        t.nonNull.list.nonNull.field('ordersTrend', { type: AdminDashboardTrendPoint });
        t.nonNull.list.nonNull.field('topPartners', { type: AdminDashboardMetric });
        t.nonNull.list.nonNull.field('topNiches', { type: AdminDashboardMetric });
        t.nonNull.list.nonNull.field('recentOrders', { type: AdminDashboardRecentOrder });
    },
});

export default {
    PricingNameEnum,
    Pricing,
    PartnerDeliverySchedule,
    PricingInput,
    Platform,
    PartnerFeeType,
    AdminDashboardWindowStats,
    AdminDashboardTrendPoint,
    AdminDashboardMetric,
    AdminDashboardRecentOrder,
    AdminDashboardStats,
} 
