// @ts-nocheck
import { objectType } from "nexus"

const Brand = objectType({
    name: 'Brand',
    definition(t) {
        t.nonNull.int('id')
        t.string('name')
        t.string('image')
        t.int('niche_id')
        t.field('niche', {
            type: 'Niche',
            resolve: async (parent, _args, ctx) => {
                if (!parent.niche_id) return null
                return ctx.prisma.niche.findUnique({
                    where: { id: parent.niche_id },
                })
            }
        })
        t.int('totalProducts', {
            resolve: async (parent, _args, ctx) => {
                return ctx.prisma.productTemplate.count({
                    where: { brand_id: parent.id },
                })
            }
        })
    },
})

const BrandResult = objectType({
    name: 'BrandResult',
    definition(t) {
        t.nonNull.list.nonNull.field('brands', { type: 'Brand' })
        t.int('totalBrands')
    },
})

export default { Brand, BrandResult } 
