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
    members: ['ANDROID', 'IOS', 'WEB'],
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


export default { PricingNameEnum, Pricing, PartnerDeliverySchedule, PricingInput, Platform } 
