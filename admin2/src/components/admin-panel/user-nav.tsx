"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ExitIcon, PersonIcon, DashboardIcon } from "@radix-ui/react-icons";

import { ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl"
export function UserNav({ children }: { children?: ReactNode | undefined }) {
  const { data } = useSession()
  const t = useTranslations("home.header")
  return (
    <DropdownMenu>
      {
        children ?
          <DropdownMenuTrigger asChild>
            {children}
          </DropdownMenuTrigger> : <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>

                  <Button
                    className="h-10 w-10 rounded-full bg-background/85"
                    variant="outline"
                    size="icon"
                  >
                    <PersonIcon />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Profile</TooltipContent>
            </Tooltip>
          </TooltipProvider>
      }


      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{data?.user?.admin?.firstname} {data?.user?.admin?.lastname}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {data?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/dashboard" className="flex items-center">
              <DashboardIcon className="w-4 h-4 mr-3 text-muted-foreground" />
              {t('dashboard')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:cursor-pointer" asChild>
            <Link href="/account" className="flex items-center">
              <PersonIcon className="w-4 h-4 mr-3 text-muted-foreground" />
              {t('account')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer" onClick={() => {
          signOut({
            callbackUrl: "/",
            redirect: true
          })
        }}>
          <ExitIcon className="w-4 h-4 mr-3 text-muted-foreground" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
