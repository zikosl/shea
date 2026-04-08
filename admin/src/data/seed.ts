

const fs = require("fs")
const path = require("path")
const { faker } = require("@faker-js/faker")
// import { faker } from "@faker-js/faker"

const {
  CheckCircledIcon,
  CrossCircledIcon,
  StopwatchIcon,
} = require("@radix-ui/react-icons")


const statuses = [
  {
    value: "in progress",
    label: "In Progress",
    icon: StopwatchIcon,
  },
  {
    value: "accepted",
    label: "Accepted",
    icon: CheckCircledIcon,
  },
  {
    value: "canceled",
    label: "Canceled",
    icon: CrossCircledIcon,
  },
]

const tasks = Array.from({ length: 100 }, () => ({
  id: `ET-${faker.number.int({ min: 100, max: 999 })}`,
  event: faker.hacker.phrase().replace(/^./, (letter) => letter.toUpperCase()),
  name: faker.person.fullName(),
  status: faker.helpers.arrayElement(statuses).value,
  date: faker.date.soon(),
}))

fs.writeFileSync(
  path.join(__dirname, "tasks.json"),
  JSON.stringify(tasks, null, 2)
)

