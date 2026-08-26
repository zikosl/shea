import { Users, LayoutPanelTop, UserCog, GalleryVerticalEnd, PackageSearch, BadgeHelp, Truck, Boxes, Sparkles, ClipboardCheck } from "lucide-react";


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
          href: "/dashboard",
          label: "Dashboard",
          active: pathname.includes("/dashboard"),
          icon: LayoutPanelTop,
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
