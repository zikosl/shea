import { z } from "zod"

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const eventSchema = z.object({
  id: z.string(),
  event: z.string(),
  name: z.string(),
  status: z.string(),
  date: z.string(),
})

export type Event = z.infer<typeof eventSchema>
