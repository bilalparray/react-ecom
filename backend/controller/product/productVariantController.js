import { ProductVariant, Product, UnitValue } from "../../db/dbconnection.js";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import { Op } from "sequelize";
import razorpay from "../../route/customer/razorpay.js";

const RAZORPAY_ITEM_CREATE_TIMEOUT_MS = 6000;
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);

/**
 * Create Product Variant
 * POST /api/admin/products/:productId/variants
 */
export const createProductVariant = async (req, res) => {
  try {
    if (req.user.role !== "Admin") return sendError(res, "Unauthorized", 403);

    const { productId } = req.params;
    const variantData = req.body.reqData || req.body; // Support both patterns for backward compatibility

    const product = await Product.findByPk(productId);
    if (!product) return sendError(res, "Product not found", 404);

    // Validate required fields
    if (!variantData.unitValueId || !variantData.quantity || !variantData.price || !variantData.sku) {
      return sendError(res, "unitValueId, quantity, price, and sku are required", 400);
    }

    // Check if SKU already exists
    const existingSku = await ProductVariant.findOne({ where: { sku: variantData.sku } });
    if (existingSku) {
      return sendError(res, "SKU already exists", 409);
    }

    // Check if barcode already exists (if provided)
    if (variantData.barcode) {
      const existingBarcode = await ProductVariant.findOne({ where: { barcode: variantData.barcode } });
      if (existingBarcode) {
        return sendError(res, "Barcode already exists", 409);
      }
    }

    // Verify unit value exists
    const unitValue = await UnitValue.findByPk(variantData.unitValueId);
    if (!unitValue) {
      return sendError(res, "Unit value not found", 404);
    }

    // Create Razorpay item (with timeout so request doesn't hang)
    const variantName = `${product.name} - ${variantData.quantity}${unitValue.symbol || unitValue.name || ''}`;
    let razorpayItemId = null;
    try {
      const razorpayItem = await withTimeout(
        razorpay.items.create({
          name: variantName,
          description: product.description || '',
          amount: Math.round(variantData.price * 100),
          currency: product.currency || "INR",
          hsn_code: product.hsnCode,
          tax_rate: product.taxRate,
          unit: unitValue.symbol || unitValue.name || '',
        }),
        RAZORPAY_ITEM_CREATE_TIMEOUT_MS,
        "Razorpay item create"
      );
      razorpayItemId = razorpayItem.id;
    } catch (razorpayError) {
      console.error("Razorpay item creation failed (or timed out):", razorpayError?.message || razorpayError);
    }

    // Check if this should be default (if no default exists)
    const existingDefault = await ProductVariant.findOne({
      where: { productId, isDefaultVariant: true },
    });
    const isDefault = variantData.isDefaultVariant !== undefined 
      ? variantData.isDefaultVariant 
      : !existingDefault;

    const variant = await ProductVariant.create({
      productId,
      unitValueId: variantData.unitValueId,
      quantity: variantData.quantity,
      price: variantData.price,
      comparePrice: variantData.comparePrice || null,
      sku: variantData.sku,
      barcode: variantData.barcode || null,
      gtin: variantData.gtin || null,
      stock: variantData.stock || 0,
      weight: variantData.weight ?? null,
      minOrderQuantity: variantData.minOrderQuantity || 1,
      maxOrderQuantity: variantData.maxOrderQuantity || null,
      discount: variantData.discount || 0,
      wholesalePrice: variantData.wholesalePrice || null,
      wholesaleMinQuantity: variantData.wholesaleMinQuantity || null,
      razorpayItemId,
      isDefaultVariant: isDefault,
      isActive: variantData.isActive !== undefined ? variantData.isActive : true,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id,
    });

    const created = await ProductVariant.findByPk(variant.id, {
      include: [
        { model: Product, as: "product" },
        { model: UnitValue, as: "unitValue" },
      ],
    });

    return sendSuccess(res, created, 201);
  } catch (e) {
    console.error("❌ CREATE PRODUCT VARIANT ERROR:", e);
    return sendError(res, e.message);
  }
};

/**
 * Update Product Variant
 * PUT /api/admin/products/:productId/variants/:variantId
 */
export const updateProductVariant = async (req, res) => {
  try {
    if (req.user.role !== "Admin") return sendError(res, "Unauthorized", 403);

    const { productId, variantId } = req.params;
    const variantData = req.body.reqData || req.body; // Support both patterns for backward compatibility

    const product = await Product.findByPk(productId);
    if (!product) return sendError(res, "Product not found", 404);

    const variant = await ProductVariant.findOne({
      where: { id: variantId, productId },
    });
    if (!variant) return sendError(res, "Variant not found", 404);

    // Check if barcode is being changed and if it conflicts
    if (variantData.barcode && variantData.barcode !== variant.barcode) {
      const existingBarcode = await ProductVariant.findOne({
        where: {
          barcode: variantData.barcode,
          id: { [Op.ne]: variantId },
        },
      });
      if (existingBarcode) {
        return sendError(res, "Barcode already exists", 409);
      }
    }

    // Update Razorpay item if price changed
    if (variantData.price && variantData.price !== variant.price && variant.razorpayItemId) {
      try {
        const unitValue = await UnitValue.findByPk(variantData.unitValueId || variant.unitValueId);
        const variantName = `${product.name} - ${variantData.quantity || variant.quantity}${unitValue?.symbol || unitValue?.name || ''}`;
        
        await razorpay.items.update(variant.razorpayItemId, {
          name: variantName,
          amount: Math.round(variantData.price * 100),
        });
      } catch (e) {
        console.error("Failed to update Razorpay item:", e);
      }
    }

    await variant.update({
      unitValueId: variantData.unitValueId !== undefined ? variantData.unitValueId : variant.unitValueId,
      quantity: variantData.quantity !== undefined ? variantData.quantity : variant.quantity,
      price: variantData.price !== undefined ? variantData.price : variant.price,
      comparePrice: variantData.comparePrice !== undefined ? variantData.comparePrice : variant.comparePrice,
      sku: variantData.sku || variant.sku,
      barcode: variantData.barcode !== undefined ? variantData.barcode : variant.barcode,
      gtin: variantData.gtin !== undefined ? variantData.gtin : variant.gtin,
      stock: variantData.stock !== undefined ? variantData.stock : variant.stock,
      minOrderQuantity: variantData.minOrderQuantity !== undefined ? variantData.minOrderQuantity : variant.minOrderQuantity,
      maxOrderQuantity: variantData.maxOrderQuantity !== undefined ? variantData.maxOrderQuantity : variant.maxOrderQuantity,
      discount: variantData.discount !== undefined ? variantData.discount : variant.discount,
      wholesalePrice: variantData.wholesalePrice !== undefined ? variantData.wholesalePrice : variant.wholesalePrice,
      wholesaleMinQuantity: variantData.wholesaleMinQuantity !== undefined ? variantData.wholesaleMinQuantity : variant.wholesaleMinQuantity,
      isDefaultVariant: variantData.isDefaultVariant !== undefined ? variantData.isDefaultVariant : variant.isDefaultVariant,
      isActive: variantData.isActive !== undefined ? variantData.isActive : variant.isActive,
      lastModifiedBy: req.user.id,
    });

    // If setting as default, unset others
    if (variantData.isDefaultVariant === true) {
      await ProductVariant.update(
        { isDefaultVariant: false },
        { where: { productId, id: { [Op.ne]: variantId } } }
      );
    }

    const updated = await ProductVariant.findByPk(variantId, {
      include: [
        { model: Product, as: "product" },
        { model: UnitValue, as: "unitValue" },
      ],
    });

    return sendSuccess(res, updated);
  } catch (e) {
    console.error("❌ UPDATE PRODUCT VARIANT ERROR:", e);
    return sendError(res, e.message);
  }
};



/**
 * Get Paginated Product Variants
 * GET /api/admin/products/:productId/variants?skip=0&limit=10
 */
export const getAllVariants = async (req, res) => {
  try {
    if (req.user.role !== "Admin") return sendError(res, "Unauthorized", 403);

    const { productId } = req.params;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    // Check product exists
    const product = await Product.findByPk(productId);
    if (!product) return sendError(res, "Product not found", 404);

    const { rows: variants, count: total } = await ProductVariant.findAndCountAll({
      where: { productId },
      include: [
        { model: UnitValue, as: "unitValue" },
      ],
      offset: skip,
      limit: limit,
      order: [["createdAt", "DESC"]],
    });

    return sendSuccess(res, {
      total,
      skip,
      limit,
      data: variants,
    });
  } catch (error) {
    console.error("❌ GET VARIANTS ERROR:", error);
    return sendError(res, error.message);
  }
};
