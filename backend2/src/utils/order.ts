// src/utils/time.ts
export function todayAt(time: string, baseDate = new Date()) {
    const [hours, minutes] = time.split(":").map(Number)

    const date = new Date(baseDate)
    date.setHours(hours, minutes, 0, 0)

    return date
}

export function pickSchedule(schedules: any[]) {
    const now = new Date()

    return schedules.find(s => {
        const start = todayAt(s.time)
        return now < start
    })
}


