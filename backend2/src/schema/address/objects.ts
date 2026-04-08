import { objectType } from "nexus"

const Address = objectType({
    name: 'Address',
    definition(t) {
        t.nonNull.int('id')
        t.string('label')
        t.string('address')
        t.float('latitude')
        t.float('longitude')
        t.boolean('isDefault')
    },
})

const AddressResult = objectType({
    name: 'AddressResult',
    definition(t) {
        t.nonNull.list.nonNull.field('addresses', { type: 'Address' })
        t.int('totalAddresses')
    },
})

export default { Address, AddressResult } 
