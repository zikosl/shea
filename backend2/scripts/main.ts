import { getAllProductLinks } from "./shopScraper";
import { scrapeProduct } from "./productScraper";

async function main() {
    const links = await getAllProductLinks();

    for (const link of links) {
        const product = await scrapeProduct(link);
        console.log(product);
        // Save to DB here
    }
}

main();