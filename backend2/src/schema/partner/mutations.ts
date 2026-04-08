import { nonNull, extendType, stringArg, intArg, booleanArg, floatArg, list } from 'nexus'
import { Context } from '../../context'
import { getUserId } from '../../utils'
import {
  addPartnerNiches,
  createPartner,
  updatePartnerProfile,
} from '../../application/partner/partner.service'
import { createBadRequestError } from '../../core/errors/app-error'

export const PartnerMutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.field('createPartner', {
            type: 'Partner',
            args: {
                email: nonNull(stringArg()),
                companyName: nonNull(stringArg()),
                niches: list(nonNull(intArg()))
            },
            resolve: async (_parent, { email: oldmail, companyName, niches }, ctx: Context) => {
                return createPartner(ctx.prisma, {
                    email: oldmail,
                    companyName,
                    niches
                })
            },
        })

        t.nonNull.list.field('addPartnerNiche', {
            type: 'PartnerNiche',
            args: {
                niches: nonNull(list(nonNull(intArg())))
            },

            resolve: async (_parent, { niches }, ctx: Context) => {
                const userId = getUserId(ctx);
                return addPartnerNiches(ctx.prisma, userId, niches)
            },
        })

        t.field('updatePartner', {
            type: 'Partner',
            args: {
                id: nonNull(intArg()),       // UUID
                email: stringArg(),
                companyName: stringArg(),
                niches: list(nonNull(intArg()))
            },
            resolve: async (_parent, { id, email, companyName, niches }, ctx: Context) => {
                // Update both User.email and Partner fields atomically
                const updated = await ctx.prisma.partner.update({
                    where: { id },
                    data: {
                        companyName: companyName ?? undefined,
                        user: email
                            ? { update: { email } }
                            : undefined,
                    }
                })
                if (niches) {
                    await ctx.prisma.partner_Niche.deleteMany({ where: { partnerId: id } })
                    await ctx.prisma.partner_Niche.createMany({
                        data: niches.map(v => ({
                            niche_id: v,
                            partnerId: id
                        }
                        )),
                        skipDuplicates: true,
                    })
                }
                return updated
            },
        })


        t.field('updatePartnerProfile', {
            type: "AuthPayload",
            args: {
                companyName: stringArg(),
                address: stringArg(),
                avatar: stringArg(),
                online: booleanArg(),
                latitude: floatArg(),
                longitude: floatArg(),
            },
            resolve: async (_parent, { companyName, avatar, online, latitude, longitude, address }, context: Context) => {
                const userId = getUserId(context)
                return updatePartnerProfile(context.prisma, userId, {
                    companyName,
                    avatar,
                    online,
                    latitude,
                    longitude,
                    address
                })
            },
        })

        t.field('deletePartner', {
            type: 'Partner',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                // Option A: delete partner profile only
                // const deleted = await ctx.prisma.partner.delete({ where: { id }, include: { user: true } })

                // Option B: delete the whole User (cascades to partner via `onDelete: Cascade`)
                try {
                    const deletedUser = await ctx.prisma.user.delete({
                        where: { id },               // here `id` is the userId
                        include: { partner: true },
                    })
                    return deletedUser.partner!
                } catch (error) {
                    throw createBadRequestError('Failed to delete partner')
                }
            },
        })
    },
})

export default PartnerMutation
