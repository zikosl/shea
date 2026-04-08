import { enumType, objectType } from 'nexus'
import { Context } from '../../context'

// Core types
export const User = objectType({
    name: 'User',
    definition(t) {
        t.nonNull.int('id');
        t.string('email');
        t.string('phone');
        t.field('role', { type: 'Role' });
        // relations
        t.field('client', { type: 'Client', resolve: async (parent, _, ctx: Context) => ctx.prisma.client.findUnique({ where: { userId: parent.id } }) });
        t.field('partner', { type: 'Partner', resolve: async (parent, _, ctx: Context) => ctx.prisma.partner.findUnique({ where: { userId: parent.id } }) });
        t.field('driver', { type: 'Driver', resolve: async (parent, _, ctx: Context) => ctx.prisma.driver.findUnique({ where: { userId: parent.id } }) });
        t.field('admin', { type: 'Admin', resolve: async (parent, _, ctx: Context) => ctx.prisma.admin.findUnique({ where: { userId: parent.id } }) });
    },
});

export const AuthPayload = objectType({
    name: 'AuthPayload',
    definition(t) {
        t.string('accessToken')
        t.string('refreshToken')
        t.string('tokenId')
        t.field("accessTokenExpires", { type: "DateTime" })
        t.field('user', { type: 'User' })
    },
});

// Role enum
export const Role = enumType({
    name: 'Role',
    members: ['ADMIN', 'CLIENT', 'PARTNER', 'DRIVER'],
});

// Profile types
export const Client = objectType({
    name: 'Client',
    definition(t) {
        t.int('id');
        t.string("firstname");
        t.string("lastname");
        t.string("avatar");
        t.string("language");
        t.boolean("theme");
        t.int('userId');
        t.float('latitude');
        t.float('longitude');
        t.string('address');
        t.field('user', {
            type: 'User',
            resolve: async (parent, _, ctx: Context) => {
                return ctx.prisma.user.findUnique({ where: { id: parent.userId ?? undefined } })
            }
        });
    },
});
export const Partner = objectType({
    name: 'Partner',
    definition(t) {
        t.int('id');
        t.string('companyName');
        t.string('avatar');
        t.boolean('online');
        t.float('latitude');
        t.float('longitude');
        t.string('address');
        t.int('userId');
        t.nonNull.list.field('niches', {
            type: 'PartnerNiche',
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.partner_Niche.findMany({
                    where: { partnerId: parent.id },
                })
            }
        })
        t.field('user', {
            type: 'User',
            resolve: (parent, _, ctx: Context) => {
                return ctx.prisma.user.findUnique({ where: { id: parent.userId ?? undefined } })
            }
        });
    },
});
export const Driver = objectType({
    name: 'Driver',
    definition(t) {
        t.int('id');
        t.string('firstname');
        t.string('lastname');
        t.boolean('online');
        t.boolean('isAvailable');
        t.int('userId');
        t.float('latitude');
        t.float('longitude');
        t.field('user', {
            type: 'User',
            resolve: async (parent, _, ctx: Context) => {
                return ctx.prisma.user.findUnique({ where: { id: parent.userId ?? undefined } })
            }
        });
    },
});
export const Admin = objectType({
    name: 'Admin',
    definition(t) {
        t.int('id');
        t.string('firstname');
        t.string('lastname');
        t.field('birthday', { type: "DateTime" });
        t.int('city');
        t.int('userId');
        t.list.string('privileges');
        t.field('user', {
            type: 'User',
            resolve: async (parent, _, ctx: Context) => {
                return ctx.prisma.user.findUnique({ where: { id: parent.userId ?? undefined } })
            }
        });
    },
});

export default {
    Admin,
    Client,
    Partner,
    Driver,
    AuthPayload,
    User,
    Role
}
