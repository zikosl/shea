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

const publicFields = (...fields: string[]) => Object.fromEntries(fields.map(field => [field, allow]))
const storefrontProductFields = publicFields('id', 'name', 'name_ar', 'price', 'priceOnRequest', 'discount', 'available', 'stock', 'trackInventory', 'image', 'images', 'partnerId', 'variantId', 'variantName', 'variantNameAr', 'sku', 'isActive', 'onlineVisible')

export const permissions = shield(
  {
    Query: {
      findManyNiches: allow,
      findOneNiche: allow,
      findManyBrands: allow,
      findOneBrand: allow,
      findManyCategories: allow,
      findOneCategory: allow,
      findManyProductTypes: allow,
      findOneProductType: allow,
      findManyPartners: allow,
      findOnePartner: allow,
      findManyProductPartners: allow,
      findManyProducts: allow,
      findOneProduct: allow,
      previewCheckout: isClient,
      findOneProductPartner: allow,
      adminDashboardStats: isAdmin,
      adminDispatchBoard: isAdmin,
      adminCatalogSubmissions: isAdmin,
      myCatalogSubmissions: isPartner,
      myProvisionalProducts: isPartner,
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
      listPartnerDriverRequests: isPartner,
      partnerDriverRequestQuote: isPartner,
      myStores: isPartner,
      myPartnerProfile: isPartner,
      adminStoreNetworks: isAdmin,
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
      resetDriverAccessCode: isAdmin,
      updateDriver: isAdmin,
      deleteDriver: isAdmin,
      adminOfferDelivery: isAdmin,
      adminAssignDelivery: isAdmin,
      adminUnassignDelivery: isAdmin,
      createPartner: isAdmin,
      resetPartnerAccessCode: isAdmin,
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
      createCatalogSubmission: isPartner,
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
      createPartnerDriverRequest: isPartner,
      cancelPartnerDriverRequest: isPartner,
      createClientGiftOrder: isClient,
      respondToGiftQuotation: isClient,
      transitionGiftOrder: isPartner,
      createGiftQuotation: isPartner,
      reserveGiftMaterials: isPartner,
      createStore: isPartner,
      setStoreDeploymentMode: isPartner,
      provisionStoreGateway: isPartner,
      revokeStoreTerminal: isPartner,
      configureStoreNetwork: isAdmin,
      createOrder: isClient,
      createOrderQuotation: isPartner,
      respondToOrderQuotation: isClient,
      deleteClientAccount: isClient,
      updateClientProfile: isClient,
      requestClientPhoneChange: isClient,
      verifyClientPhoneChange: isClient,
      driverOrder: isDriver,
      pickOrder: isDriver,
      deliverOrder: isDriver,
      '*': isAuthenticated,
    },
    // Allow only storefront data; internal costs, notes and private relations retain the fallback rule.
    Niche: publicFields('id', 'name', 'name_ar', 'image'),
    NicheResult: publicFields('niches', 'totalNiches'),
    Brand: publicFields('id', 'name', 'name_ar', 'image', 'niche_id'),
    BrandResult: publicFields('brands', 'totalBrands'),
    Category: publicFields('id', 'name', 'name_ar', 'image', 'niche_id'),
    CategoryResult: publicFields('categories', 'totalCategories'),
    ProductType: publicFields('id', 'name', 'name_ar', 'category_id'),
    ProductTypeResult: publicFields('productTypes', 'totalProductTypes'),
    PartnerResult: publicFields('partners', 'totalPartners'),
    PartnerNiche: publicFields('id', 'niche'),
    Product: storefrontProductFields,
    ProductView: {
      ...storefrontProductFields,
      ...publicFields('product_template_id', 'product_type_id', 'category_id', 'brand_id'),
    },
    ProductViewResult: publicFields('products', 'totalProducts'),
    ProductTemplatePartnerPreview: publicFields('product_template_id', 'product_id', 'partnerId', 'name', 'name_ar', 'description', 'description_ar', 'price', 'priceOnRequest', 'discount', 'stock', 'trackInventory', 'available', 'brand_id', 'category_id', 'variantId', 'variant_name', 'variant_name_ar', 'variant_sku', 'product_type_id', 'image', 'images', 'products', 'isActive', 'onlineVisible'),
    ProductTemplatePartnerPreviewResult: publicFields('productPartners', 'totalProductPartners'),
    ProductImage: publicFields('id', 'url', 'altText', 'variantId', 'product_template_id'),
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
