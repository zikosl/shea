"use client"
import * as React from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu"
import { useTransition } from "react";
import { Locale } from "../../config";
import { useLocale, useTranslations } from 'next-intl';

import {
    setUserLocale
} from "@/services/locale"
import { languages } from "@/constant";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function SelectLanguage({ triggerClassName }: { triggerClassName?: string }) {
    const [isPending, startTransition] = useTransition();
    const t = useTranslations('LocaleSwitcher');
    const locale = useLocale();

    function onChange(value: string) {
        const locale = value as Locale;
        startTransition(() => {
            setUserLocale(locale);
        });
    }
    const item = React.useMemo(() => {
        return languages.find((v) => v.label === locale) ?? languages[0]
    }, [locale])
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    "cursor-pointer rounded-full border border-rose-100 bg-white/75 p-2 outline-0 shadow-none transition-colors hover:bg-rose-50 dark:border-rose-400/16 dark:bg-white/8 dark:hover:bg-white/12",
                    triggerClassName
                )}
                asChild
            >
                <div className="flex items-center gap-2">
                    <Image
                        alt={item.label}
                        width={18}
                        height={16}
                        src={item.image}
                        style={{ width: 18, height: 16 }}
                    />
                    <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-100 sm:inline">
                        {item.label}
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuRadioGroup value={locale} onValueChange={onChange}>
                    {
                        languages.map((v, i) => {
                            return (
                                <DropdownMenuRadioItem value={v.label} key={i} >
                                    <div className="flex cursor-pointer gap-1">
                                        <Image
                                            key={i}
                                            alt={v.label}
                                            width={18}
                                            height={16}
                                            src={v.image}
                                            style={{ width: 18, height: 16 }}
                                        />
                                        <span>{t(v.label)}</span>
                                    </div>
                                </DropdownMenuRadioItem>
                            )
                        })
                    }
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu >
    )
}
