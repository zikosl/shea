"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import { DialogFooter } from "@/components/ui/dialog"

const passwordValidation = new RegExp(
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
)

const FormSchema = z.object({
    email: z.string().min(2, {
        message: "email must be at least 2 characters.",
    }).email("This is not a valid email."),
    password: z.string().regex(passwordValidation, {
        message: 'Your password must contain uppercase, lowercase, symbol, and number.',
    }),
})

function InputForm() {
    const t = useTranslations("home.login")
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        setLoading(true)
        try {
            await signIn("credentials", { ...data, callbackUrl: "/dashboard" })
        } catch (error) {
        } finally {
            setLoading(false)
        }
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
                            <FormDescription>{t("emailmsg")}</FormDescription>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("password")}</FormLabel>
                            <FormControl>
                                <Input placeholder={t("password")} type="password" {...field} />
                            </FormControl>
                            <FormDescription>{t("passwordmsg")}</FormDescription>
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"></span>
                                {t("loading")}
                            </span>
                        ) : t("button")}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

export default function LoginPopup() {
    return (
        <div className="w-[20rem] border border-gray-200 rounded-lg p-4 space-y-4">
            <InputForm />
        </div>
    )
}
