// @ts-nocheck
import { arg, extendType, intArg, stringArg } from 'nexus'
import { CapabilityCode } from '@prisma/client'
import { getUserId } from '../../utils'
import { requireCapability } from '../../modules/capabilities/service'
import { giftOrderInclude } from '../../modules/gift-store/service'

export default extendType({ type:'Query', definition(t){
  t.nonNull.list.nonNull.field('listGiftOrders',{ type:'CustomOrder', args:{status:arg({type:'CustomOrderStatus'}),search:stringArg(),limit:intArg()}, resolve:async(_r,args,ctx)=>{ const partnerId=getUserId(ctx); await requireCapability(ctx.prisma,partnerId,CapabilityCode.CUSTOM_ORDERS); return ctx.prisma.customOrder.findMany({where:{partnerId,status:args.status??undefined,OR:args.search?[{orderNumber:{contains:args.search,mode:'insensitive'}},{customerName:{contains:args.search,mode:'insensitive'}}]:undefined},include:giftOrderInclude,orderBy:{updatedAt:'desc'},take:Math.min(args.limit??100,250)}) }})
  t.field('getGiftOrder',{type:'CustomOrder',args:{id:stringArg()},resolve:async(_r,{id},ctx)=>{const partnerId=getUserId(ctx);await requireCapability(ctx.prisma,partnerId,CapabilityCode.CUSTOM_ORDERS);return id?ctx.prisma.customOrder.findFirst({where:{id,partnerId},include:giftOrderInclude}):null}})
  t.nonNull.list.nonNull.field('listMyGiftOrders',{ type:'CustomOrder', args:{status:arg({type:'CustomOrderStatus'}),limit:intArg()}, resolve:async(_r,args,ctx)=>ctx.prisma.customOrder.findMany({where:{clientId:getUserId(ctx),status:args.status??undefined},include:giftOrderInclude,orderBy:{updatedAt:'desc'},take:Math.min(args.limit??100,250)}) })
  t.field('getMyGiftOrder',{type:'CustomOrder',args:{id:stringArg()},resolve:async(_r,{id},ctx)=>id?ctx.prisma.customOrder.findFirst({where:{id,clientId:getUserId(ctx)},include:giftOrderInclude}):null})
} })
