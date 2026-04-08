import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"
import { getUserId } from "../../utils"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneAddress', {
            type: 'Address',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.address.findUnique({
                    where: { id },
                })
            },
        })


        t.field('findManyUserAddresses', {
            type: 'AddressResult',
            args: {
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false }, ctx: Context) => {
                const userId = getUserId(ctx)
                const where: Prisma.AddressWhereInput = search
                    ? {
                        userId,
                        OR: [
                            { label: { contains: search, mode: 'insensitive' } },
                            // { description: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {
                        userId
                    };
                const args: Prisma.AddressFindManyArgs = isFull ? {
                    where,
                } : {
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                }
                const totalAddresses = await ctx.prisma.address.count({ where });
                const addresses = await ctx.prisma.address.findMany(args);

                return {
                    addresses,
                    totalAddresses,
                };
            },
        });
    },
})

export default Query
