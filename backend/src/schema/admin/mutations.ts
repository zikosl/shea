import { arg, intArg, nonNull, booleanArg, objectType, stringArg } from "nexus"
import { Context } from "../../context"
import { getUserId, handleSignIn } from "../../utils"
import { createBadRequestError } from "../../core/errors/app-error"



const Mutation = objectType({
    name: 'Mutation',
    definition(t) {
        t.boolean('registerPushToken', {
            args: {
                token: nonNull(stringArg()),
                platform: nonNull('Platform'),
                deviceId: stringArg(),
            },

            async resolve(_, { token, platform, deviceId }, ctx) {
                const userId = getUserId(ctx)
                if (!userId) {
                    throw new Error('Unauthorized');
                }

                await ctx.prisma.pushToken.upsert({
                    where: { token },
                    update: {
                        userId: userId,
                        platform,
                        deviceId,
                        isActive: true,
                        lastUsedAt: new Date(),
                    },
                    create: {
                        token,
                        userId: userId,
                        platform,
                        deviceId,
                        lastUsedAt: new Date(),
                    },
                });

                return true;
            },
        })
        t.field('upsertPricing', {
            type: 'Pricing',
            args: {
                name: nonNull(arg({ type: 'PricingName' })),
                price: nonNull(intArg()),
            },
            resolve: async (_, { name, price }, ctx) => {
                return ctx.prisma.pricing.upsert({
                    where: { name },
                    update: { price },
                    create: { name, price },
                });
            },
        })
        t.field('createSchedule', {
            type: 'PartnerDeliverySchedule',
            args: {
                time: nonNull(stringArg()),
            },
            resolve: async (_, { time }, ctx) => {
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                    throw createBadRequestError('Invalid delivery time');
                }
                const existing = await ctx.prisma.partnerDeliverySchedule.findFirst({
                    where: { time },
                });
                if (existing?.isActive) {
                    throw createBadRequestError('Delivery time already exists');
                }
                if (existing) {
                    return ctx.prisma.partnerDeliverySchedule.update({
                        where: { id: existing.id },
                        data: { isActive: true },
                    });
                }
                return ctx.prisma.partnerDeliverySchedule.create({
                    data: {
                        time,
                    },
                });
            },
        });

        t.field('deleteSchedule', {
            type: 'PartnerDeliverySchedule',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_, { id }, ctx) => {
                return ctx.prisma.partnerDeliverySchedule.update({
                    where: { id },
                    data: { isActive: false },
                });
            },
        });

        t.field('updateProfile', {
            type: "AuthPayload",
            args: {
                firstname: nonNull(stringArg()),
                lastname: nonNull(stringArg()),
                birthday: nonNull(arg({ type: "DateTime" })),
                city: nonNull(intArg())
            },
            resolve: async (_parent, args, context: Context) => {
                args.firstname = args.firstname.toLowerCase()
                args.lastname = args.lastname.toLowerCase()
                const userId = getUserId(context)
                try {
                    const value = await context.prisma.admin.update({
                        where: {
                            userId: userId
                        },
                        data: args,
                        include: {
                            user: true
                        }
                    })
                    const token = await handleSignIn(value.user, context.prisma)
                    return token
                }
                catch (e) {
                    throw createBadRequestError("Something wrong")
                }
            },
        })
    },
})



export default Mutation
