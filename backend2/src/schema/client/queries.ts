import { nonNull, extendType, stringArg } from "nexus"
import { verify } from "jsonwebtoken"
import { Context } from "../../context"
import { GraphQLError } from "graphql"

export const Query = extendType({
    type: 'Query',
    definition(t) {

    },
})

export default Query