import { arg, intArg, nonNull, extendType, stringArg, booleanArg, floatArg } from "nexus"
import { Context } from "../../context"
import { getUserId } from "../../utils"

const Mutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createAddress', {
            type: 'Address',
            args: {
                label: nonNull(stringArg()),
                address: stringArg(),
                longitude: nonNull(floatArg()),
                latitude: nonNull(floatArg()),
            },
            resolve: async (
                _parent,
                data: { label: string; address?: string | null; longitude: number; latitude: number },
                ctx: Context,
            ) => {
                const { label, longitude, address, latitude } = data

                const userId = getUserId(ctx)
                const newAddress = await ctx.prisma.address.create({
                    data: {
                        label, longitude, latitude,
                        address: address ?? '',
                        userId
                    },
                })
                return newAddress
            },
        })

        t.field('updateAddress', {
            type: 'Address',
            args: {
                id: nonNull(intArg()),
                label: stringArg(),
                address: stringArg(),
                longitude: floatArg(),
                latitude: floatArg(),
                isDefault: booleanArg()
            },
            resolve: async (
                _parent,
                data: { id: number; label?: string | null; address?: string | null; longitude?: number | null; latitude?: number | null; isDefault?: boolean | null },
                ctx: Context,
            ) => {
                const userId = getUserId(ctx);
                const { id, label, longitude, address, latitude, isDefault } = data
                if (isDefault) {
                    await ctx.prisma.address.updateMany({
                        where: {
                            userId
                        },
                        data: {
                            isDefault: false
                        }
                    })
                }
                const updatedAddress = await ctx.prisma.address.update({
                    where: { id },
                    data: {
                        label: label ?? undefined,
                        longitude: longitude ?? undefined,
                        latitude: latitude ?? undefined,
                        address: address ?? undefined,
                        isDefault: isDefault ?? undefined
                    },
                })
                return updatedAddress
            },
        })

        t.field('deleteAddress', {
            type: 'Address',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                const userId = getUserId(ctx);
                const deletedAddress = await ctx.prisma.address.delete({
                    where: { id, userId },
                })
                return deletedAddress
            },
        })
    },
})

export default Mutation
