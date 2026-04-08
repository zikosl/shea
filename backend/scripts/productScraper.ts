import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedProduct {
    name: string;
    description: string;
    images: string[];
    categories: string[];
    attributes: { name: string; values: string[] }[];
}

export async function scrapeProduct(
    url: string
): Promise<ScrapedProduct> {
    const { data } = await axios.get<string>(url);
    const $ = cheerio.load(data);

    const name = $("h1.product_title").text().trim();
    const description = $(".woocommerce-product-details__short-description")
        .text()
        .trim();

    const images: string[] = [];
    $(".woocommerce-product-gallery__image img").each((_, el) => {
        const src = $(el).attr("src");
        if (src) images.push(src);
    });

    const categories: string[] = [];
    $(".posted_in a").each((_, el) => {
        categories.push($(el).text().trim());
    });

    const attributes: { name: string; values: string[] }[] = [];

    $(".woocommerce-product-attributes-item").each((_, el) => {
        const attrName = $(el)
            .find(".woocommerce-product-attributes-item__label")
            .text()
            .trim();

        const values = $(el)
            .find(".woocommerce-product-attributes-item__value")
            .text()
            .split(",")
            .map((v) => v.trim());

        attributes.push({ name: attrName, values });
    });

    return { name, description, images, categories, attributes };
}