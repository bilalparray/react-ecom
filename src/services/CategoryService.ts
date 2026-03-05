import { fetchCategories } from "../api/category.api";

export async function getCategories() {
  const res = await fetchCategories();
  if (res?.isError || !res?.successData || !Array.isArray(res.successData)) {
    console.warn("Failed to fetch categories:", res?.errorData?.displayMessage || "Unknown error");
    return [];
  }
  return res.successData.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.category_icon_base64,
  }));
}
