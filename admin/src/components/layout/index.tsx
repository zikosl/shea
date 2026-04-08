import Link from "next/link";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { ReactNode } from "react";

export default function GlobalLayout({ children }: { children: ReactNode }) {
    return (
        <Card className="rounded-lg border-none flex mt-6 min-h-[calc(100vh-56px-64px-20px-24px-56px-48px)]">
            <CardContent className="p-6 flex flex-1">
                {/* <ScrollArea className="flex"> */}
                {
                    children
                }
                {/* </ScrollArea> */}
            </CardContent>
        </Card>
    );
}
