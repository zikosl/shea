import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { prisma } from "./src/servers"

interface Brand {
    name: string;
    image: string;
    localImage?: string;
}

const LINK = "https://cosmeticstoredz.com/categorie-produit/marque/";
const IMAGE_DIR = path.join(__dirname, "uploads", "brands");

// Ensure folder exists
if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

function sanitizeFileName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_");
}

async function downloadImage(imageUrl: string, brandName: string): Promise<string> {
    const fileName = sanitizeFileName(brandName) + path.extname(imageUrl);
    const filePath = path.join(IMAGE_DIR, fileName);

    const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
    });

    fs.writeFileSync(filePath, response.data);

    return path.join("/brands", fileName);
}

async function scrapeBrands(): Promise<Brand[]> {
    const { data } = await axios.get<string>(LINK);
    const $ = cheerio.load(data);

    const brands: Brand[] = [];

    $(".product-category").each((_, element) => {
        const name = $(element)
            .find("h2")
            .contents()
            .first()
            .text()
            .trim();

        let image = $(element).find("img").attr("src") || "";

        if (image && !image.startsWith("http")) {
            image = new URL(image, LINK).href.replace('300', '600');
        }

        if (name && image) {
            brands.push({ name, image });
        }
    });

    return brands;
}

export async function extractBrands() {
    const brands = await scrapeBrands();

    for (const brand of brands) {
        try {
            const localPath = await downloadImage(brand.image, brand.name);
            brand.image = localPath;
            console.log(`Downloaded: ${brand.name}`);
        } catch (error) {
            console.error(`Failed for ${brand.name}`);
        }
    }
    await prisma.brand.createMany({
        data: brands
    })
    console.log("Done ✅");
}
