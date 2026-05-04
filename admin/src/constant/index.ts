import en from "@/../public/en.svg";
import fr from "@/../public/fr.svg";

const normalizeBaseUrl = (value?: string) => value?.replace(/\/+$/, "") ?? "";

const apiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL) || "/api";
const publicBaseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_PUBLIC_URL) ||
    (apiBaseUrl === "/api" ? "" : apiBaseUrl.replace(/\/api$/, ""));

export const serverEndpoint = `${apiBaseUrl}/graphql`;
export const endpoint = `${apiBaseUrl}/graphql`;

export const resolvePublicAssetUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${publicBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

export const languages = [
    {
        label: "en",
        image: en
    },
    {
        label: "fr",
        image: fr
    }
]
