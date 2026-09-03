// @ts-nocheck
import { arg, extendType, intArg, nonNull, stringArg } from 'nexus'
import { getUserId } from '../../utils'
import { createClientGiftOrder, createGiftOrder, createGiftQuotation, reserveGiftMaterials, respondToGiftQuotation, transitionGiftOrder } from '../../modules/gift-store/service'

export default extendType({type:'Mutation',definition(t){
  t.nonNull.field('createGiftOrder',{type:'CustomOrder',args:{input:nonNull(arg({type:'CreateGiftOrderInput'}))},resolve:(_r,{input},ctx)=>createGiftOrder(ctx.prisma,getUserId(ctx),input)})
  t.nonNull.field('createClientGiftOrder',{type:'CustomOrder',args:{input:nonNull(arg({type:'CreateGiftOrderInput'}))},resolve:(_r,{input},ctx)=>createClientGiftOrder(ctx.prisma,getUserId(ctx),input)})
  t.nonNull.field('respondToGiftQuotation',{type:'CustomOrder',args:{customOrderId:nonNull(stringArg()),accept:nonNull(arg({type:'Boolean'})),addressId:intArg()},resolve:(_r,{customOrderId,accept,addressId},ctx)=>respondToGiftQuotation(ctx.prisma,getUserId(ctx),customOrderId,accept,addressId)})
  t.nonNull.field('transitionGiftOrder',{type:'CustomOrder',args:{id:nonNull(stringArg()),status:nonNull(arg({type:'CustomOrderStatus'})),expectedVersion:nonNull(intArg())},resolve:(_r,{id,status,expectedVersion},ctx)=>transitionGiftOrder(ctx.prisma,getUserId(ctx),id,status,expectedVersion)})
  t.nonNull.field('createGiftQuotation',{type:'GiftQuotation',args:{customOrderId:nonNull(stringArg()),validUntil:arg({type:'DateTime'}),note:stringArg()},resolve:(_r,args,ctx)=>createGiftQuotation(ctx.prisma,getUserId(ctx),args.customOrderId,args.validUntil,args.note)})
  t.nonNull.field('reserveGiftMaterials',{type:'CustomOrder',args:{customOrderId:nonNull(stringArg())},resolve:(_r,{customOrderId},ctx)=>reserveGiftMaterials(ctx.prisma,getUserId(ctx),customOrderId)})
} })
