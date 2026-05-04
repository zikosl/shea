'use client';

import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";

import { resolvePublicAssetUrl } from "@/constant";

import { Item } from "../../_constant";
import { CellAction } from "./cell-action";

export const columns: ColumnDef<Item>[] = [
  {
    id: "image",
    header: "Image",
    cell: ({ row }) => (
      <Image
        alt={`${row.original.name} image`}
        unoptimized
        src={resolvePublicAssetUrl(row.original.image)}
        width={150}
        height={100}
      />
    ),
    size: 200,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
  },
  {
    accessorKey: "name_ar",
    header: "Arabic Name",
    size: 200,
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
  },
];
