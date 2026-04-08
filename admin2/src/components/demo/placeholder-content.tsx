import Link from "next/link";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "../ui/scroll-area";
import GlobalLayout from "../layout";

export default function PlaceholderContent() {
  return (
    <GlobalLayout>
      <div className="flex justify-center items-center flex-1">
        <div className="dark:text-white text-black text-2xl">
          coming soon ...
        </div>
      </div>
    </GlobalLayout>
  );
}
