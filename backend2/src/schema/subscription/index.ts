import { subscriptionType } from 'nexus'
import { getUserId } from '../../utils'

export const Subscription = subscriptionType({
    definition(t) {
        t.field('notification', {
            type: 'String',
            subscribe: async (_root, _args, ctx) => {
                const id = getUserId(ctx)
                return ctx.pubsub.asyncIterator(`NOTIF_${id}`)
            },
            resolve: (payload) => String((payload as any)?.notification ?? ''),
        })
    },
})
