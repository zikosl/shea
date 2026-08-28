import { GET_ALL_BRANDS, FIND_MANY_CATEGORIES, FIND_MANY_NICHES, FIND_MANY_PRODUCT_TYPES } from '@/api/queries';
import { requestServerGraphQL } from '@/lib/server-request';

export type CatalogFilterOptions = {
  niches: Niche[];
  categories: Category[];
  brands: Brand[];
  productTypes: ProductType[];
};

export async function getCatalogFilterOptions(): Promise<CatalogFilterOptions> {
  const [nichesResponse, categoriesResponse, brandsResponse, productTypesResponse] = await Promise.all([
    requestServerGraphQL<{
      findManyNiches: {
        niches: Niche[];
      };
    }>(FIND_MANY_NICHES, {
      search: undefined,
      page: 1,
      limit: 1000,
      isFull: true,
    }),
    requestServerGraphQL<{
      findManyCategories: {
        categories: Category[];
      };
    }>(FIND_MANY_CATEGORIES, {
      search: undefined,
      page: 1,
      limit: 1000,
      isFull: true,
    }),
    requestServerGraphQL<{
      getAllBrands: Brand[];
    }>(GET_ALL_BRANDS, {
      niche_id: undefined,
    }),
    requestServerGraphQL<{
      findManyProductTypes: {
        productTypes: ProductType[];
      };
    }>(FIND_MANY_PRODUCT_TYPES, {
      search: undefined,
      page: 1,
      limit: 1000,
      isFull: true,
    }),
  ]);

  return {
    niches: nichesResponse.findManyNiches.niches,
    categories: categoriesResponse.findManyCategories.categories,
    brands: brandsResponse.getAllBrands,
    productTypes: productTypesResponse.findManyProductTypes.productTypes,
  };
}
