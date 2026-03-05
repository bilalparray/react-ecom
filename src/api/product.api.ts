import type { ProductDTO } from "../dto/productDTO";
import { apiGet } from "./base/apiClient";

export function fetchProduct(productId: number) {
  return apiGet<ProductDTO>(`/product/${productId}`);
}
export function fetchPaginatedProducts(skip: number, top: number) {
  return apiGet<any>(`/product/paginated?skip=${skip}&top=${top}`);
}
export function fetchProductCount() {
  return apiGet<any>("/product/count");
}
export function fetchProductsByCategory(
  categoryId: number,
  skip: number,
  top: number
) {
  return apiGet<any>(
    `/product/ByCategoryId/${categoryId}/paginated?skip=${skip}&top=${top}`
  );
}

export function fetchProductCountByCategory(categoryId: number) {
  return apiGet<any>(`/product/ByCategoryId/${categoryId}/count`);
}

export function searchProductFromHeader(query: string) {
  const q = encodeURIComponent(query);
  // Backend expects: /product/search?query=apple&q=banana&top=10&skip=0
  // We send the same search text for both query and q, with fixed paging.
  return apiGet<any>(`/product/search?query=${q}&q=${q}&top=10&skip=0`);
}