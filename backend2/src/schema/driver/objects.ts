import { objectType } from "nexus"

const DriverResult = objectType({
    name: 'DriverResult',
    definition(t) {
        t.nonNull.list.nonNull.field('drivers', { type: 'Driver' })
        t.int('totalDrivers')
    },
})

export default {
    DriverResult
}