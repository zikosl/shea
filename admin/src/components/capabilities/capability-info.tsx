"use client";

import { Info, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CapabilityDetails = {
  title: string;
  summary: string;
  enables: string[];
  worksWith: string;
};

const capabilityDetails: Record<CapabilityCode, CapabilityDetails> = {
  CUSTOM_ORDERS: {
    title: "Custom orders",
    summary: "Adds the workspace for made-to-order products and services that do not follow a standard checkout flow.",
    enables: [
      "Create and receive custom customer requests",
      "Track requested dates and order progress",
      "Manage custom items alongside catalog products",
    ],
    worksWith: "Foundation for quotations, production, and gift-building workflows.",
  },
  QUOTATIONS: {
    title: "Quotations",
    summary: "Lets the partner price a custom request and send an estimate for customer approval before fulfillment begins.",
    enables: [
      "Prepare itemized estimates",
      "Wait for customer acceptance or rejection",
      "Convert an accepted estimate into a confirmed order",
    ],
    worksWith: "Requires Custom orders and is normally followed by Production.",
  },
  GIFT_BUILDER: {
    title: "Gift builder",
    summary: "Enables composed gifts made from catalog products, custom services, or a combination of both.",
    enables: [
      "Build a gift from available store items",
      "Capture occasion and gift-message details",
      "Offer pickup or delivery when available",
    ],
    worksWith: "Uses Custom orders and can use Quotations for price approval.",
  },
  GIFT_TEMPLATES: {
    title: "Gift templates",
    summary: "Provides reusable gift configurations so staff can start from a proven arrangement instead of rebuilding it each time.",
    enables: [
      "Reuse common gift combinations",
      "Standardize recurring arrangements",
      "Speed up creation from the POS catalog",
    ],
    worksWith: "Most useful with Gift builder and the local product catalog.",
  },
  PRODUCTION: {
    title: "Production",
    summary: "Adds preparation stages for orders that must be assembled, manufactured, or customized before handoff.",
    enables: [
      "Reserve tracked materials and products",
      "Move confirmed orders into preparation",
      "Mark completed work as ready for handoff",
    ],
    worksWith: "Usually follows an accepted quotation or confirmed custom order.",
  },
  PRODUCTION_TASKS: {
    title: "Production tasks",
    summary: "Breaks preparation into operational tasks that teams can track from pending through completion.",
    enables: [
      "Create clear preparation steps",
      "Track in-progress and blocked work",
      "Coordinate responsibility across the team",
    ],
    worksWith: "Extends Production for businesses with multi-step preparation.",
  },
  DELIVERY_PICKUP: {
    title: "Delivery and pickup",
    summary: "Lets eligible orders specify how and when the finished order reaches the customer.",
    enables: [
      "Offer store pickup",
      "Capture delivery fulfillment details",
      "Schedule handoff around the requested date",
    ],
    worksWith: "Used by custom orders and gift orders; delivery may continue into driver dispatch.",
  },
  GIFT_GALLERY: {
    title: "Gift gallery",
    summary: "Adds a visual showcase for completed arrangements and gift ideas customers or staff can use for inspiration.",
    enables: [
      "Present finished gift examples",
      "Organize inspiration separately from sellable stock",
      "Support faster conversations about custom designs",
    ],
    worksWith: "Complements Gift builder; gallery entries are not inventory by themselves.",
  },
  GIFT_REPORTS: {
    title: "Gift reports",
    summary: "Adds reporting focused on custom and gift activity rather than standard point-of-sale transactions alone.",
    enables: [
      "Review custom-order volume and value",
      "Monitor quotation conversion",
      "Understand gift and production performance",
    ],
    worksWith: "Insights become richer as Custom orders, Quotations, and Production are used.",
  },
};

type CapabilityInfoProps = {
  code: CapabilityCode;
  enabled: boolean;
  source: "inherited" | "override";
};

export function CapabilityInfo({ code, enabled, source }: CapabilityInfoProps) {
  const details = capabilityDetails[code];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label={`Learn about ${details.title}`}
          title={`Learn about ${details.title}`}
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{details.title}</DialogTitle>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full",
                enabled
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground",
              )}
            >
              {enabled ? "Enabled" : "Disabled"} via {source}
            </Badge>
          </div>
          <DialogDescription className="pt-2 text-left leading-6">
            {details.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <p className="mb-2 text-sm font-semibold">What it enables</p>
            <ul className="space-y-2">
              {details.enables.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-5 text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Works with</p>
            <p className="mt-1.5 text-sm leading-5">{details.worksWith}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
