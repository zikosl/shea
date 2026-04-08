import { nonNull, extendType, stringArg, intArg, booleanArg } from "nexus"
import { Prisma } from "@prisma/client"
import { Context } from "../../context"

export const Query = extendType({
    type: 'Query',
    definition(t) {
        t.field('findOneDriver', {
            type: 'Driver',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                return ctx.prisma.driver.findUnique({
                    where: { id },
                })
            },
        })

        t.field('findManyDrivers', {
            type: 'DriverResult',
            args: {
                search: stringArg(),
                page: nonNull(intArg()),
                limit: nonNull(intArg()),
                isFull: booleanArg(),
            },
            resolve: async (_parent, { search, page, limit, isFull = false }, ctx: Context) => {
                if (isFull) {
                    const drivers = await ctx.prisma.driver.findMany({});
                    return {
                        drivers,
                        totalDrivers: drivers.length,
                    };
                }

                const where: Prisma.DriverWhereInput = search
                    ? {
                        OR: [
                            { firstname: { contains: search, mode: 'insensitive' } },
                            { lastname: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {};

                const totalDrivers = await ctx.prisma.driver.count({ where });
                const drivers = await ctx.prisma.driver.findMany({
                    where,
                    take: limit,
                    skip: limit * (page - 1),
                });

                return {
                    drivers,
                    totalDrivers,
                };
            },
        });
    },
})

export default Query
