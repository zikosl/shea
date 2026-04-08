
export const errorUtility = (e: any) => e?.response?.errors?.length > 0 ? e?.response?.errors[0].message : "somthing wrong please try again later"