import { fetchBestSellingProducts } from "../api/bestSelling.api";
import {
  fetchPaginatedProducts,
  fetchProduct,
  fetchProductCount,
  searchProductFromHeader as fetchSearchProductsFromHeader,
} from "../api/product.api";
import { fetchRelatedProducts } from "../api/related-products.api";
import type { ProductDTO } from "../dto/productDTO";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVaraint";
import { Unit } from "../models/Unit";

function mapVariant(v: any): ProductVariant {
  return new ProductVariant(
    v.id,
    parseFloat(v.price),
    parseFloat(v.comparePrice),
    v.stock,
    parseFloat(v.weight),
    new Unit(v.unitName, v.unitSymbol),
    v.isDefaultVariant
  );
}

function mapProduct(dto: ProductDTO): Product {
  return new Product(
    dto.id,
    dto.name,
    dto.description,
    dto.category.id,
    dto.images,
    dto.variants.map(mapVariant),
    0,
    0,
    dto.isBestSelling,
    dto.category,
    dto.richDescription
  );
}

export async function getProduct(productId: number): Promise<Product> {
  const response = await fetchProduct(productId);
  const dto = response.successData; // Assuming the data is in the `data` property of the response
  if (dto != null) {
    return mapProduct(dto);
  }
  throw new Error("Product not found");
}
export async function getProductCount(): Promise<number> {
  const res = await fetchProductCount();
  return res.successData.intResponse;
}
export async function getBestSellingProducts(): Promise<Product[]> {
  const dtos = await fetchBestSellingProducts();
  if (dtos?.isError || !dtos?.successData || !Array.isArray(dtos.successData)) {
    console.warn("Failed to fetch best selling products:", dtos?.errorData?.displayMessage || "Unknown error");
    return [];
  }
  return dtos.successData.map(mapProduct);
}
export async function getRelatedProducts(id: number): Promise<Product[]> {
  const dtos = await fetchRelatedProducts(id);
  if (dtos?.isError || !dtos?.successData || !Array.isArray(dtos.successData)) {
    console.warn("Failed to fetch related products:", dtos?.errorData?.displayMessage || "Unknown error");
    return [];
  }
  return dtos.successData.map(mapProduct);
}
export async function getPaginatedProducts(skip: number, top: number) {
  const response = await fetchPaginatedProducts(skip, top);
  if (response?.isError || !response?.successData || !Array.isArray(response.successData)) {
    console.warn("Failed to fetch paginated products:", response?.errorData?.displayMessage || "Unknown error");
    return { products: [] };
  }
  return {
    products: response.successData.map(mapProduct),
  };
}
export async function getPaginatedProductsForGrid(skip: number, top: number) {
  const response = await fetchPaginatedProducts(skip, top);
  if (response?.isError || !response?.successData || !Array.isArray(response.successData)) {
    console.warn("Failed to fetch products for grid:", response?.errorData?.displayMessage || "Unknown error");
    return [];
  }
  return response.successData.map(mapProduct);
}

export async function searchProductFromHeader(query: string) {
  const response = await fetchSearchProductsFromHeader(query);

  const data: any = response?.successData.products;

  // Normalize to always return an array
  if (Array.isArray(data)) {
    return data;
  }

  // Some APIs wrap results in { data: [...] }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}