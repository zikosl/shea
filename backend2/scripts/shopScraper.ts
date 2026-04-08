import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://cosmeticstoredz.com";

export async function getAllProductLinks(): Promise<string[]> {
    let page = 1;
    let hasMore = true;
    const productLinks: string[] = [];

    while (hasMore) {
        const url =
            page === 1
                ? `${BASE_URL}/shop/`
                : `${BASE_URL}/shop/page/${page}/`;

        console.log("Scraping:", url);

        const { data } = await axios.get<string>(url);
        const $ = cheerio.load(data);

        const products = $(".product a.woocommerce-LoopProduct-link");

        if (products.length === 0) {
            hasMore = false;
            break;
        }

        products.each((_, el) => {
            const link = $(el).attr("href");
            if (link) productLinks.push(link);
        });

        page++;
    }

    return [...new Set(productLinks)];
}