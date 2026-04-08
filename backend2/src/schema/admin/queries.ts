import { nonNull, objectType, stringArg } from "nexus"
import { verify } from "jsonwebtoken"
import { Context } from "../../context"
import { GraphQLError } from "graphql"

export const Query = objectType({
    name: 'Query',
    definition(t) {
        t.nonNull.list.field('findManyPricing', {
            type: 'Pricing',
            resolve: async (_, __, ctx) => {
                return ctx.prisma.pricing.findMany({});
            },
        })
        t.nonNull.list.field('findManySchedule', {
            type: 'PartnerDeliverySchedule',
            resolve: async (_, __, ctx) => {
                return ctx.prisma.partnerDeliverySchedule.findMany({
                    where: {
                        isActive: true
                    }
                });
            },
        })
    },
})

export default Query