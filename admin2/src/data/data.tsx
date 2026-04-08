import {
  CheckCircledIcon,
  CrossCircledIcon,
  StopwatchIcon,
} from "@radix-ui/react-icons"


export const statuses = [
  {
    value: "in progress",
    label: "In Progress",
    icon: StopwatchIcon,
    class: "text-orange-500"
  },
  {
    value: "accepted",
    label: "Accepted",
    icon: CheckCircledIcon,
    class: "text-green-500"
  },
  {
    value: "canceled",
    label: "Canceled",
    icon: CrossCircledIcon,
    class: "text-red-500"
  },
]

