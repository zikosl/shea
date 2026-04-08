import React from 'react'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Event } from '@/data/schema'
import { statuses } from '@/data/data'
import dayjs from 'dayjs'
import { MiniTableRowActions } from './mini-table-row-actions'

export default function Table({ data }: { data: Event[] }) {

    return (
        <Accordion type="single" className='flex-1' collapsible>
            {
                data.map((v, i) => {
                    const status = statuses.find(
                        (status) => status.value === v.status
                    )
                    return (
                        <AccordionItem key={i} value={`item-${i + 1}`}>
                            <AccordionTrigger className={`text-justify ${status?.class}`}>{v.event}</AccordionTrigger>
                            <AccordionContent>
                                <div className='flex justify-between'>
                                    <div>
                                        <div className='text-gray-950 font-semibold'>{v.name}</div>
                                        <div className='text-zinc-600 '>{dayjs(v.date).format("DD MMM YYYY")}</div>
                                    </div>
                                    <div>
                                        <MiniTableRowActions row={v} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })
            }
        </Accordion>
    )
}
