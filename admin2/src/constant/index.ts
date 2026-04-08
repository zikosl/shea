import Image from "next/image";
import en from "@/../public/en.svg";
import fr from "@/../public/fr.svg";

// export const serverEndpoint = "https://sheya.gaminos.cc/graphql";
// export const endpoint = "https://sheya.gaminos.cc/graphql";


export const serverEndpoint = "http://host.docker.internal:4000/graphql";
export const endpoint = "http://localhost:4000/graphql";

// export const endpoint = "http://back.glowy.com";
// export const wsendpoint = "ws://mac.local:4000/subscriptions";

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