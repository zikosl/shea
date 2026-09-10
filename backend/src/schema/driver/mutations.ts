import { nonNull, extendType, stringArg, intArg, booleanArg, floatArg } from 'nexus'
import { Context } from '../../context'
import { generateAccessCode } from '../../utils/password'
import bcrypt from 'bcryptjs'
import { sendEmailPassword } from '../../utils/mailer'
import { getUserId, handleSignIn } from '../../utils'
import { createBadRequestError } from '../../core/errors/app-error'
import {
    ensureEmailAvailable,
    throwAccountWriteError,
} from '../../application/auth/auth.service'
import { resetAccountAccessCode } from '../../application/auth/access-code.service'

export const DriverMutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.nonNull.boolean('resetDriverAccessCode', {
            args: { id: nonNull(intArg()) },
            resolve: async (_parent, { id }, ctx: Context) => resetAccountAccessCode(ctx.prisma, {
                actorId: getUserId(ctx),
                kind: 'DRIVER',
                profileId: id,
            }),
        })

        t.field('createDriver', {
            type: 'Driver',
            args: {
                email: nonNull(stringArg()),
                firstname: nonNull(stringArg()),
                lastname: nonNull(stringArg()),
            },
            resolve: async (_parent, { email: oldmail, firstname, lastname }, ctx: Context) => {
                // 1. Generate & hash password
                const email = await ensureEmailAvailable(ctx.prisma, oldmail)
                const password = generateAccessCode()
                const passwordHash = await bcrypt.hash(password, 10)

                try {
                    const userWithDriver = await ctx.prisma.user.create({
                        data: {
                            email,
                            passwordHash,
                            role: 'DRIVER',
                            authMethod: 'EMAIL_PASSWORD',
                            driver: {
                                create: {
                                    firstname,
                                    lastname,
                                },
                            },
                        },
                        include: { driver: true },
                    })
                    sendEmailPassword({ email, password, name: firstname }).catch(console.error)

                    // 4. Return the Driver profile (with user relation populated)
                    return userWithDriver.driver
                }
                catch (error) {
                    throwAccountWriteError(error, 'DRIVER_CREATION_FAILED')
                }
                // 2. Create the User + Driver in one nested write


                // 3. Send the password via email (fire & forget)

            },
        })

        t.field('updateDriver', {
            type: 'Driver',
            args: {
                id: nonNull(intArg()),       // UUID
                email: stringArg(),
                firstname: stringArg(),
                lastname: stringArg(),
            },
            resolve: async (_parent, { id, email, firstname, lastname }, ctx: Context) => {
                const driver = await ctx.prisma.driver.findUnique({
                    where: { id },
                    select: { userId: true },
                })
                if (!driver) throw createBadRequestError('DRIVER_NOT_FOUND')

                const normalizedEmail = email
                    ? await ensureEmailAvailable(ctx.prisma, email, driver.userId)
                    : undefined

                try {
                    return await ctx.prisma.driver.update({
                        where: { id },
                        data: {
                            firstname: firstname ?? undefined,
                            lastname: lastname ?? undefined,
                            user: normalizedEmail
                                ? { update: { email: normalizedEmail } }
                                : undefined,
                        }
                    })
                } catch (error) {
                    throwAccountWriteError(error, 'DRIVER_UPDATE_FAILED')
                }
            },
        })


        t.field('updateDriverProfile', {
            type: "AuthPayload",
            args: {
                firstname: stringArg(),
                lastname: stringArg(),
                online: booleanArg()
            },
            resolve: async (_parent, { firstname, lastname, online }, context: Context) => {

                const userId = getUserId(context)
                try {
                    await context.prisma.driver.update({
                        where: { userId },
                        data: {
                            firstname: firstname ?? undefined,
                            lastname: lastname ?? undefined,
                            online: online ?? undefined
                        }
                    });
                    const value = await context.prisma.user.findUnique({
                        where: {
                            id: userId
                        },
                    })
                    const token = await handleSignIn(value, context.prisma)
                    return token
                }
                catch (e) {
                    throw createBadRequestError("Something wrong")
                }
            },
        })

        t.field('updateDriverLocation', {
            type: 'Driver',
            args: {
                latitude: nonNull(floatArg()),
                longitude: nonNull(floatArg()),
                isAvailable: booleanArg(),
            },
            resolve: async (_parent, { latitude, longitude, isAvailable }, context: Context) => {
                const userId = getUserId(context)
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) {
                    throw createBadRequestError('A valid driver location is required')
                }
                return context.prisma.driver.update({
                    where: { userId },
                    data: {
                        latitude,
                        longitude,
                        locationUpdatedAt: new Date(),
                        isAvailable: isAvailable ?? undefined,
                    },
                })
            },
        })

        t.field('deleteDriver', {
            type: 'Driver',
            args: {
                id: nonNull(intArg()),
            },
            resolve: async (_parent, { id }, ctx: Context) => {
                // Option A: delete driver profile only
                // const deleted = await ctx.prisma.driver.delete({ where: { id }, include: { user: true } })

                // Option B: delete the whole User (cascades to driver via `onDelete: Cascade`)
                const deletedUser = await ctx.prisma.user.delete({
                    where: { id },               // here `id` is the userId
                    include: { driver: true },
                })
                return deletedUser.driver!
            },
        })
    },
})

export default DriverMutation
