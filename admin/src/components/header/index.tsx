import { getServerSession } from "next-auth";
import LoginPopup from "../login";
import { Button } from "../ui/button";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { TextAlignJustifyIcon, PersonIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { UserNav } from "../admin-panel/user-nav";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import logo from "@/../public/logo.png";
import SelectLanguage from "@/components/language";
import { getTranslations } from 'next-intl/server';

export default async function Header() {
    const session = await getServerSession(options)
    const t = await getTranslations("home.header")
    return (
        <header className="fixed z-10 bg-gray-900/20 w-full top-0 flex lg:h-16 h-12 items-center gap-4 px-4 lg:px-6">
            <div className="flex flex-row flex-1 justify-between" >
                <div className="hidden lg:flex lg:text-base text-sm flex-row lg:flex-1 justify-start gap-2">
                    <Link href="#" className="text-white uppercase">{t('home')}</Link>
                    <div className="text-primary font-bold">/</div>
                    <Link href="#ticket" className="text-white uppercase">{t('ticket')}</Link>
                    <div className="text-primary font-bold">/</div>
                    <Link href="#reach" className="text-white uppercase">{t('about')}</Link>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 lg:hidden rounded-lg"
                        >
                            <TextAlignJustifyIcon fontVariant="Bold" className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-primary border-0 text-white" align="end" forceMount>
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="hover:cursor-pointer" asChild>
                                <Link href="#" className="flex uppercase items-center">
                                    {t('home')}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:cursor-pointer" asChild>
                                <Link href="#ticket" className="flex uppercase items-center">
                                    {t('ticket')}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:cursor-pointer" asChild>
                                <Link href="#reach" className="flex uppercase items-center">
                                    {t('about')}
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="lg:text-lg text-base my-auto pl-4 md:pl-0 text-white text-center font-semibold">
                    <Image
                        alt="shea"
                        src={logo}
                        width={100}
                        height={40}
                    />
                </div>
                {
                    session ? <div className="flex flex-row lg:flex-1 justify-end">
                        <div className="flex flex-row justify-center items-center gap-2">
                            <UserNav>
                                <Button
                                    variant={"outline"}
                                    className="lg:text-base capitalize text-sm lg:h-10 lg:px-8 h-7 px-4 font-medium flex gap-2"
                                >
                                    <PersonIcon width={18} height={18} />{t("profile")}
                                </Button>
                            </UserNav>
                            <SelectLanguage />
                        </div>
                    </div> : <LoginPopup />
                }
            </div>
        </header>
    )
}
