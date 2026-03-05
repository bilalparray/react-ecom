/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product browsing and search endpoints
 */

import express from "express";
import {
  searchProductsOdata,
  getAllProducts,
  getProductById,
  getAllProductsByOdata,
  getProductCount,
  getNewArrivalProducts,
  getProductsByCategoryId,
  getProductCountByCategoryId,
  getRecentBestSellingProducts
} from "../../controller/product/productController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/product/search:
 *   get:
 *     tags:
 *       - Products
 *     summary: Search products (optimized)
 *     description: |
 *       Search products by name. Returns only essential data (id, name, thumbnail) for fast autocomplete/suggestions.
 *       - Returns only active products (isActive = true)
 *       - Returns only first image per product as compressed WebP thumbnail (200x200)
 *       - Default limit is 6 results
 *       - Supports both 'query' and 'q' parameters (backward compatible)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Search keyword (minimum 1 character). Also accepts 'q' parameter for backward compatibility.
 *         example: "apple"
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Alternative search keyword parameter (backward compatible)
 *         example: "banana"
 *       - in: query
 *         name: top
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of results to return (default 6).
 *         example: 10
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of results to skip for pagination.
 *         example: 0
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseStatusCode:
 *                   type: integer
 *                   example: 200
 *                 isError:
 *                   type: boolean
 *                   example: false
 *                 responseData:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Apple"
 *                           thumbnail:
 *                             type: string
 *                             nullable: true
 *                             description: Base64 encoded WebP thumbnail (200x200) or null if no image
 *                             example: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEAAkA4JQBdAD6jQAA3p..."
 *                     total:
 *                       type: integer
 *                       description: Total number of matching products
 *                       example: 25
 *                     count:
 *                       type: integer
 *                       description: Number of products in current response
 *                       example: 6
 *       400:
 *         description: Bad request - query parameter missing or too short
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseStatusCode:
 *                   type: integer
 *                   example: 400
 *                 isError:
 *                   type: boolean
 *                   example: true
 *                 errorData:
 *                   type: object
 *                   properties:
 *                     displayMessage:
 *                       type: string
 *                       example: "Please enter at least 1 character"
 *       404:
 *         description: No products found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseStatusCode:
 *                   type: integer
 *                   example: 404
 *                 isError:
 *                   type: boolean
 *                   example: true
 *                 errorData:
 *                   type: object
 *                   properties:
 *                     displayMessage:
 *                       type: string
 *                       example: "No products found for this keyword"
 */
router.get("/search", searchProductsOdata);

/**
 * @swagger
 * /api/v1/product:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 *     description: Returns all products without pagination
 *     security: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/", getAllProducts);

/**
 * @swagger
 * /api/v1/product/paginated:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get paginated products
 *     description: Returns products with pagination and OData support
 *     security: []
 *     parameters:
 *       - in: query
 *         name: $filter
 *         schema:
 *           type: string
 *         description: OData filter expression
 *       - in: query
 *         name: $orderby
 *         schema:
 *           type: string
 *         description: OData orderby expression
 *       - in: query
 *         name: $skip
 *         schema:
 *           type: integer
 *         description: Number of records to skip
 *       - in: query
 *         name: $top
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Paginated products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/paginated", getAllProductsByOdata);

/**
 * @swagger
 * /api/v1/product/count:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product count
 *     description: Returns the total number of products
 *     security: []
 *     responses:
 *       200:
 *         description: Product count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/count", getProductCount);

/**
 * @swagger
 * /api/v1/product/ByCategoryId/{categoryId}/paginated:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get paginated products by category
 *     description: Returns products filtered by category ID with pagination
 *     security: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/ByCategoryId/:categoryId/paginated", getProductsByCategoryId);

/**
 * @swagger
 * /api/v1/product/new-arrivals:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get new arrival products
 *     description: Returns recently added products
 *     security: []
 *     responses:
 *       200:
 *         description: New arrival products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/new-arrivals", getNewArrivalProducts);

/**
 * @swagger
 * /api/v1/product/isBestSelling:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get best selling products
 *     description: Returns recent best selling products
 *     security: []
 *     responses:
 *       200:
 *         description: Best selling products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/isBestSelling", getRecentBestSellingProducts);

/**
 * @swagger
 * /api/v1/product/count/ByCategoryId/{categoryId}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product count by category
 *     description: Returns the total number of products in a category
 *     security: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Product count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/count/ByCategoryId/:categoryId", getProductCountByCategoryId);

/**
 * @swagger
 * /api/v1/product/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by ID
 *     description: Returns a specific product by its ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", getProductById);

export default router;
