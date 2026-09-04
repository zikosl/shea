import { Users, LayoutPanelTop, UserCog, GalleryVerticalEnd, PackageSearch, PackagePlus, BadgeHelp, Truck, Boxes, Sparkles, ClipboardCheck, SlidersHorizontal, Download, MapPinned } from "lucide-react";


type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: any;
  submenus: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/commerce-settings",
          label: "Commerce",
          active: pathname.includes("/commerce-settings"),
          icon: SlidersHorizontal,
          submenus: []
        },
        {
          href: "/dashboard",
          label: "Dashboard",
          active: pathname.includes("/dashboard"),
          icon: LayoutPanelTop,
          submenus: []
        },
        {
          href: "/dispatch",
          label: "Dispatch Control",
          active: pathname.includes("/dispatch"),
          icon: MapPinned,
          submenus: []
        },
        {
          href: "/pos-updates",
          label: "POS Updates",
          active: pathname.includes("/pos-updates"),
          icon: Download,
          submenus: []
        }
      ]
    },
    {
      groupLabel: "Contents",
      menus: [
        {
          href: "/partners",
          label: "Partners",
          active: pathname.includes("/partner"),
          icon: Users,
          submenus: []
        },
        {
          href: "/drivers",
          label: "Drivers",
          active: pathname.includes("/driver"),
          icon: Truck,
          submenus: []
        },
        {
          href: "/categories",
          label: "Categories",
          active: pathname.includes("/categories"),
          icon: GalleryVerticalEnd,
          submenus: []
        },
        {
          href: "/niches",
          label: "Niches",
          active: pathname.includes("/niches"),
          icon: Sparkles,
          submenus: []
        },
        {
          href: "/products",
          label: "Product Types",
          active: pathname.includes("/products"),
          icon: PackageSearch,
          submenus: []
        },
        {
          href: "/product-templates",
          label: "Product Templates",
          active: pathname.includes("/product-templates"),
          icon: Boxes,
          submenus: []
        },
        {
          href: "/product-requests",
          label: "Product Requests",
          active: pathname.includes("/product-requests"),
          icon: ClipboardCheck,
          submenus: []
        },
        {
          href: "/catalog-requests",
          label: "Catalog Requests",
          active: pathname.includes("/catalog-requests"),
          icon: PackagePlus,
          submenus: []
        },
        {
          href: "/brands",
          label: "Brands",
          active: pathname.includes("/brands"),
          icon: BadgeHelp,
          submenus: []
        }
      ]
    },
    {
      groupLabel: "Settings",
      menus: [
        {
          href: "/account",
          label: "Account",
          active: pathname.includes("/account"),
          icon: UserCog,
          submenus: []
        }
      ]
    }
  ];
}
