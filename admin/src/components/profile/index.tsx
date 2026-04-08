"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import willaya from "@/../public/willaya.json"

import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import dayjs from "dayjs"
import { CommandList } from "cmdk"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import { signIn, useSession } from "next-auth/react"
import { Session } from "next-auth"

const languages = [
    { label: "English", value: "en" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Spanish", value: "es" },
    { label: "Portuguese", value: "pt" },
    { label: "Russian", value: "ru" },
    { label: "Japanese", value: "ja" },
    { label: "Korean", value: "ko" },
    { label: "Chinese", value: "zh" },
] as const

const accountFormSchema = z.object({
    firstname: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    lastname: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    birthday: z.date({
        required_error: "A date of birth is required.",
    }),
    city: z.number({
        required_error: "Please select a city.",
    }).int({
        message: "don't mess with the console please"
    }).gt(0).lte(58),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.


export function Profile({ user }: { user: User }) {
    const { update } = useSession()

    const defaultValues: Partial<AccountFormValues> = {
        firstname: user.admin.firstname ?? "",
        lastname: user.admin.lastname ?? "",
        birthday: user.admin.birthday ? dayjs(user.admin.birthday).toDate() : dayjs().toDate(),
        city: user.admin.city ?? 16
    }

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    })
    function onSubmit(data: AccountFormValues) {
        update(data).then(e => {
            toast({
                title: "Success",
                variant: "success",
                description: (
                    <div>Profile updated with success</div>
                ),
            })
        }).catch(e => {
            toast({
                title: "Error",
                variant: "destructive",
                description: (
                    <div>Somthing wrong pleas try again</div>
                ),
            })
        })

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
                <div className="md:flex flex-row gap-6">
                    <FormField
                        control={form.control}
                        name="firstname"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your First Name" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This is the name that will be displayed on your profile and in
                                    emails.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastname"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Family Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your Family Name" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This is the name that will be displayed on your profile and in
                                    emails.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="md:flex flex-row gap-6">
                    <FormField
                        control={form.control}
                        name="birthday"
                        render={({ field }) => (
                            <FormItem className="flex-1 flex flex-col">
                                <FormLabel>Date of birth</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outlinedate"}
                                                className={cn(
                                                    "w-auto pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    dayjs(field.value).format("MMM DD, YYYY")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Your date of birth is used to calculate your age.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem className="flex-1 flex flex-col">
                                <FormLabel>City</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outlinedate"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? willaya.find(
                                                        (city) => parseInt(city.id) === field.value
                                                    )?.name
                                                    : "Select City"}
                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search City..." />
                                            <CommandEmpty>No city found.</CommandEmpty>
                                            <ScrollArea>
                                                <CommandList className="h-[200px]">
                                                    {/* <CommandGroup> */}
                                                    {willaya.map((city) => (
                                                        <CommandItem
                                                            value={city.name}
                                                            key={city.id}
                                                            onSelect={() => {
                                                                form.setValue("city", parseInt(city.id))
                                                            }}
                                                        >
                                                            <CheckIcon
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    parseInt(city.id) === field.value
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {city.name}
                                                        </CommandItem>
                                                    ))}
                                                    {/* </CommandGroup> */}
                                                </CommandList>
                                            </ScrollArea>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Select Your City.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex items-end flex-1 justify-end">
                    <Button className="mt-auto" type="submit">Update account</Button>
                </div>
            </form>
        </Form>
    )
}