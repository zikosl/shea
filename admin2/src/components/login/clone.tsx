"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Button } from "@/components/ui/button"
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
import { toast } from "@/components/ui/use-toast"


const passwordValidation = new RegExp(
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
);

const FormSchema = z.object({
    email: z.string().min(2, {
        message: "email must be at least 2 characters.",
    })
        .email("This is not a valid email.")
    ,
    password: z.string().regex(passwordValidation, {
        message: 'Your password Must contains Letters Maj and Min, Symbole and Number',
    }),
})


const VerificationSchema = z.object({
    email: z.string().min(2, {
        message: "email must be at least 2 characters.",
    })
        .email("This is not a valid email.")
    ,
})

function InputForm() {
    const t = useTranslations("home.login")
    const { trigger: signInTrigger } = useMutation({ query: LOGIN })
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        signInTrigger({
            variables: data
        })
            .then((e) => {
                signIn("credentials", { ...data, callbackUrl: "/dashboard" })
            }).catch(e => {
                toast({
                    title: "Error :",
                    variant: "destructive",
                    description: (
                        <div className="text-lg">
                            {errorUtility(e)}
                        </div>
                    ),
                })
            })

    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("email")}</FormLabel>
                            <FormControl>
                                <Input placeholder={t("email")} {...field} />
                            </FormControl>
                            <FormDescription>
                                {t("emailmsg")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input placeholder={t("password")} {...field} />
                            </FormControl>
                            <FormDescription>
                                {t("passwordmsg")}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit">{t("button")}</Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

import {
    DialogFooter,
} from "@/components/ui/dialog"
import { signIn } from "next-auth/react"
import { useMutation } from "@/context/swr"
import { LOGIN } from "@/api/mutations"
import { errorUtility } from "@/lib/error"
import { useTranslations } from 'next-intl';

export default function LoginPopup() {
    const t = useTranslations("home")
    return (
        <div className="w-[20rem] border border-gray-200 rounded-lg p-4 space-y-4">
            <InputForm />
        </div>
    )
}
