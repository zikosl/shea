import { applyMiddleware } from 'graphql-middleware'

import {
  asNexusMethod,
  makeSchema,
} from 'nexus'
import User from './schema/user'
import Admin from './schema/admin'
import Niche from './schema/niche'
import Client from './schema/client'
import Partner from './schema/partner'
import Category from './schema/category'
import Brand from './schema/brand'
import Utilities from './schema/utilities'
import ProductType from './schema/product-type'
import Product from './schema/product'
import Order from './schema/order'
import Driver from './schema/driver'
import Address from './schema/address'
import Log from './schema/log-events'
import Pos from './schema/pos'
import CatalogProposal from './schema/catalog-proposal'
import Capability from './schema/capability'
import GiftStore from './schema/gift-store'
import StoreNetwork from './schema/store-network'

import { DateTimeResolver } from 'graphql-scalars'
import { permissions } from './security/shield'

export const DateTime = asNexusMethod(DateTimeResolver, 'date')


const schemaWithoutPermissions = makeSchema({
  types: [
    DateTime,
    Admin,
    Order,
    Niche,
    Partner,
    Client,
    User,
    Category,
    Brand,
    Utilities,
    ProductType,
    Product,
    Log,
    Pos,
    CatalogProposal,
    Capability,
    GiftStore,
    StoreNetwork,
    Driver,
    Address
  ],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})

export const schema = applyMiddleware(schemaWithoutPermissions, permissions)

// export const schema = schemaWithoutPermissions
