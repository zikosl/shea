// export function slugify(str: string) {
//     return str
//         .toString()
//         .trim()
//         .toLowerCase()
//         .replace(/\s+/g, "-")
//         .replace(/[^a-z0-9-]/g, "")
//         .replace(/-+/g, "-");
// }

// export function generateSKU(productName: string, attributes: string[]) {
//     const base = slugify(productName).toUpperCase().slice(0, 6);
//     const attrCode = attributes.map(attr => slugify(attr).toUpperCase().substring(0, 3)).join("-");
//     return `${base}-${attrCode}`;
// }

// type Variant = {
//     sku: string;
//     attributes: Record<string, string>;
//     isSellable: boolean;
// };

// export function generateVariants(
//     productName: string,
//     attributeOptions: Record<string, string[]>,
//     existingOptions: Record<string, string[]> = {}
// ): Variant[] {
//     const keys = Object.keys(attributeOptions);

//     function combine(index: number, current: Record<string, string>): Variant[] {
//         if (index === keys.length) {
//             const attrs = { ...current };
//             const sku = generateSKU(productName, Object.values(attrs));

//             return [
//                 {
//                     sku,
//                     attributes: attrs,
//                     isSellable: true,
//                 },
//             ];
//         }

//         const key = keys[index];
//         const results: Variant[] = [];

//         for (const option of attributeOptions[key]) {
//             results.push(...combine(index + 1, { ...current, [key]: option }));
//         }

//         return results;
//     }

//     const all = combine(0, {});

//     // helper to check if a variant matches existingOptions exactly
//     function isExcluded(variant: Variant): boolean {
//         return Object.keys(existingOptions).every((key) => {
//             const allowedValues = existingOptions[key];
//             if (!allowedValues) return true;
//             return allowedValues.includes(variant.attributes[key]);
//         });
//     }

//     return all.filter((variant) => !isExcluded(variant));
// }

// type Variants = Record<string, string[]>;


// export function mergeVariants(a: Variants, b: Variants): Variants {
//     const result: Variants = { ...a };
//     for (const key of Object.keys(b)) {
//         if (result[key]) {
//             result[key] = Array.from(new Set([...result[key], ...b[key]]));
//         } else {
//             result[key] = [...b[key]];
//         }
//     }
//     return result;
// }