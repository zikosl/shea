import React from 'react'
import Table from './table'

export default function MiniTable({ data }) {
    return (
        <div className='flex flex-1'>
            <Table data={data} />
        </div>
    )
}
