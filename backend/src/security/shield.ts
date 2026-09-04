import { allow, rule, shield } from 'graphql-shield'
import { getUserId } from '../utils'
import { createForbiddenError, createUnauthorizedError } from '../core/errors/app-error'

const isAuthenticated = rule({ cache: 'contextual' })(async (_parent, _args, ctx) => {
  try {
    getUserId(ctx)
    return true
  } catch (error) {
    return createUnauthorizedError('EXPIRED TOKEN')
  }
})

const hasRole = (role: 'ADMIN' | 'CLIENT' | 'PARTNER' | 'DRIVER') =>
  rule({ cache: 'contextual' })(async (_parent, _args, ctx) => {
    try {
      const id = getUserId(ctx)
      const user = await ctx.prisma.user.findUnique({
        where: { id },
        select: { role: true },
      })
      return user?.role === role || createForbiddenError(`${role} role required`)
    } catch {
      return createUnauthorizedError('EXPIRED TOKEN')
    }
  })

const isAdmin = hasRole('ADMIN')
const isPartner = hasRole('PARTNER')
const isClient = hasRole('CLIENT')
const isDriver = hasRole('DRIVER')

export const permissions = shield(
  {
    Query: {
      adminDashboardStats: isAdmin,
      adminDispatchBoard: isAdmin,
      getDriverRoute: isDriver,
      posBootstrap: isPartner,
      listDevices: isPartner,
      listSales: isPartner,
      getSale: isPartner,
      listStockMovements: isPartner,
      listCashSessions: isPartner,
      listSyncEvents: isPartner,
      nicheCapabilityDefaults: isAdmin,
      partnerCapabilityOverrides: isAdmin,
      listGiftOrders: isPartner,
      getGiftOrder: isPartner,
      listMyGiftOrders: isClient,
      getMyGiftOrder: isClient,
      '*': isAuthenticated,
    },
    Mutation: {
      verifyOtp: allow,
      sendOtp: allow,
      signIn: allow,
      refreshToken: allow,
      createBrand: isAdmin,
      updateBrand: isAdmin,
      deleteBrand: isAdmin,
      createCategory: isAdmin,
      updateCategory: isAdmin,
      deleteCategory: isAdmin,
      createNiche: isAdmin,
      updateNiche: isAdmin,
      deleteNiche: isAdmin,
      createProductType: isAdmin,
      updateProductType: isAdmin,
      deleteProductType: isAdmin,
      createProductTemplate: isAdmin,
      updateProductTemplate: isAdmin,
      updateProductTemplateImages: isAdmin,
      deleteProductTemplate: isAdmin,
      createVariant: isAdmin,
      updateVariant: isAdmin,
      deleteVariant: isAdmin,
      approveProductTemplateRequest: isAdmin,
      rejectProductTemplateRequest: isAdmin,
      mergeProductTemplateRequest: isAdmin,
      approveCatalogProposal: isAdmin,
      mergeCatalogProposal: isAdmin,
      rejectCatalogProposal: isAdmin,
      createDriver: isAdmin,
      updateDriver: isAdmin,
      deleteDriver: isAdmin,
      adminOfferDelivery: isAdmin,
      adminAssignDelivery: isAdmin,
      adminUnassignDelivery: isAdmin,
      createPartner: isAdmin,
      updatePartner: isAdmin,
      deletePartner: isAdmin,
      upsertPricing: isAdmin,
      createSchedule: isAdmin,
      deleteSchedule: isAdmin,
      updateProfile: isAdmin,
      createProduct: isPartner,
      createManyProducts: isPartner,
      updateProduct: isPartner,
      deleteProduct: isPartner,
      submitProductTemplateRequest: isPartner,
      submitCatalogProposal: isPartner,
      updatePartnerProfile: isPartner,
      updateDriverLocation: isDriver,
      partnerOrder: isPartner,
      createPartnerPosOrder: isPartner,
      registerDevice: isPartner,
      createSale: isPartner,
      openCashSession: isPartner,
      closeCashSession: isPartner,
      recordSyncEvent: isPartner,
      setNicheCapability: isAdmin,
      setPartnerCapabilityOverride: isAdmin,
      createGiftOrder: isPartner,
      createClientGiftOrder: isClient,
      respondToGiftQuotation: isClient,
      transitionGiftOrder: isPartner,
      createGiftQuotation: isPartner,
      reserveGiftMaterials: isPartner,
      createOrder: isClient,
      updateClientProfile: isClient,
      driverOrder: isDriver,
      pickOrder: isDriver,
      deliverOrder: isDriver,
      '*': isAuthenticated,
    },
    AuthPayload: {
      '*': allow,
    },
    User: {
      '*': allow,
    },
    Admin: {
      '*': allow,
    },
    Client: {
      '*': allow,
    },
    Partner: {
      '*': allow,
    },
    Driver: {
      '*': allow,
    },
  },
  {
    fallbackRule: isAuthenticated,
    fallbackError: createUnauthorizedError(),
    allowExternalErrors: true,
  },
)
