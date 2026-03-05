import { Order, OrderRecord, ProductVariant, StockTransaction } from "../db/dbconnection.js";
import { Op } from "sequelize";

/**
 * Stock Management Helper
 * Provides atomic, idempotent stock operations for order lifecycle events
 */

/**
 * Check if stock has already been reduced for an order
 * @param {number} orderId - Order ID
 * @returns {Promise<boolean>} - True if stock was already reduced
 */
async function hasStockBeenReduced(orderId) {
  const transaction = await StockTransaction.findOne({
    where: {
      orderId,
      transactionType: 'reduce',
      isReversed: false,
    },
  });
  return !!transaction;
}

/**
 * Check if stock has already been restored for an order
 * @param {number} orderId - Order ID
 * @returns {Promise<boolean>} - True if stock was already restored
 */
async function hasStockBeenRestored(orderId) {
  const transaction = await StockTransaction.findOne({
    where: {
      orderId,
      transactionType: 'restore',
      isReversed: false,
    },
  });
  return !!transaction;
}

/**
 * Atomically reduce stock for all variants in an order
 * @param {number} orderId - Order ID
 * @param {string} orderStatus - Current order status
 * @param {object} metadata - Additional metadata (payment ID, event, etc.)
 * @param {object} transaction - Sequelize transaction (optional, for atomicity)
 * @returns {Promise<{success: boolean, message: string, transactions: Array}>}
 */
export async function reduceStockForOrder(orderId, orderStatus = 'paid', metadata = {}, transaction = null) {
  const t = transaction || await Order.sequelize.transaction();
  let shouldCommit = !transaction;

  try {
    console.log(`🚀 [STOCK-REDUCE] Starting stock reduction for order ${orderId}, status: ${orderStatus}`);
    
    // Idempotency check: Don't reduce stock twice
    if (await hasStockBeenReduced(orderId)) {
      console.log(`ℹ️ [STOCK-REDUCE] Stock already reduced for order ${orderId}, skipping (idempotent)`);
      if (shouldCommit) await t.rollback();
      return {
        success: true,
        message: 'Stock already reduced (idempotent)',
        transactions: [],
        skipped: true,
      };
    }

    // ✅ CRITICAL FIX: Fetch order records first, then fetch variants directly with locking
    const orderRecords = await OrderRecord.findAll({
      where: { orderId },
      attributes: ['id', 'productVariantId', 'quantity'],
      transaction: t,
    });

    if (orderRecords.length === 0) {
      throw new Error(`No order records found for order ${orderId}`);
    }

    console.log(`📦 [STOCK-REDUCE] Processing ${orderRecords.length} order record(s) for order ${orderId}`);

    const stockTransactions = [];
    const errors = [];

    // ✅ Process each variant atomically with direct fetch and row-level locking
    for (const record of orderRecords) {
      const productVariantId = record.productVariantId;
      const quantityOrdered = Number(record.quantity) || 0;

      if (!productVariantId) {
        errors.push(`ProductVariantId missing for order record ${record.id}`);
        continue;
      }

      if (quantityOrdered <= 0) {
        console.warn(`⚠️ [STOCK-REDUCE] Invalid quantity for order record ${record.id}: ${quantityOrdered}`);
        continue;
      }

      // ✅ CRITICAL FIX: Fetch variant directly with row-level lock (SELECT FOR UPDATE)
      const variant = await ProductVariant.findByPk(productVariantId, {
        transaction: t,
        lock: t.LOCK.UPDATE, // Row-level lock prevents concurrent modifications
      });

      if (!variant) {
        const error = `Variant ${productVariantId} not found for order record ${record.id}`;
        console.error(`❌ [STOCK-REDUCE] ${error}`);
        errors.push(error);
        continue;
      }

      const currentStock = Number(variant.stock) || 0;
      console.log(`🔍 [STOCK-REDUCE] Variant ${variant.id} (${variant.sku}): Current stock = ${currentStock}, Ordered = ${quantityOrdered}`);

      // Validate stock availability
      if (currentStock < quantityOrdered) {
        const error = `Insufficient stock for variant ${variant.id} (${variant.sku}). Current: ${currentStock}, Ordered: ${quantityOrdered}`;
        console.error(`❌ [STOCK-REDUCE] ${error}`);
        errors.push(error);
        
        // Still create transaction record for audit, but set stock to 0
        const newStock = 0;
        
        // ✅ CRITICAL FIX: Use direct update with WHERE clause for atomicity
        const [affectedRows] = await ProductVariant.update(
          { stock: newStock },
          {
            where: { id: productVariantId },
            transaction: t,
          }
        );

        if (affectedRows === 0) {
          throw new Error(`Failed to update stock for variant ${productVariantId} - no rows affected`);
        }

        console.log(`⚠️ [STOCK-REDUCE] Set stock to 0 for variant ${variant.id} (insufficient stock). Rows affected: ${affectedRows}`);
        
        const stockTransaction = await StockTransaction.create({
          orderId,
          productVariantId: variant.id,
          quantity: -quantityOrdered, // Negative for reduction
          previousStock: currentStock,
          newStock,
          transactionType: 'reduce',
          orderStatus,
          metadata: {
            ...metadata,
            error: 'Insufficient stock',
            orderRecordId: record.id,
          },
        }, { transaction: t });

        stockTransactions.push(stockTransaction);
        continue;
      }

      // ✅ CRITICAL FIX: Use atomic SQL update with WHERE clause
      const newStock = currentStock - quantityOrdered;
      
      // Method 1: Use Model.update() with WHERE (most reliable)
      const [affectedRows] = await ProductVariant.update(
        { stock: newStock },
        {
          where: { id: productVariantId },
          transaction: t,
        }
      );

      if (affectedRows === 0) {
        throw new Error(`Failed to update stock for variant ${productVariantId} - no rows affected`);
      }

      // ✅ Verify the update actually happened
      const verifyVariant = await ProductVariant.findByPk(productVariantId, {
        attributes: ['id', 'stock'],
        transaction: t,
      });

      if (!verifyVariant || Number(verifyVariant.stock) !== newStock) {
        throw new Error(`Stock update verification failed for variant ${productVariantId}. Expected: ${newStock}, Got: ${verifyVariant?.stock}`);
      }

      console.log(`✅ [STOCK-REDUCE] Variant ${variant.id} (${variant.sku}): ${currentStock} → ${newStock} (Rows affected: ${affectedRows}, Verified: ${verifyVariant.stock})`);

      // Create transaction record for audit
      const stockTransaction = await StockTransaction.create({
        orderId,
        productVariantId: variant.id,
        quantity: -quantityOrdered, // Negative for reduction
        previousStock: currentStock,
        newStock,
        transactionType: 'reduce',
        orderStatus,
        metadata: {
          ...metadata,
          orderRecordId: record.id,
          affectedRows,
          verified: true,
        },
      }, { transaction: t });

      stockTransactions.push(stockTransaction);
    }

    if (shouldCommit) {
      await t.commit();
      console.log(`✅ [STOCK-REDUCE] Transaction committed for order ${orderId}. ${stockTransactions.length} stock transaction(s) created.`);
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 
        ? `Stock reduced with ${errors.length} warning(s)` 
        : 'Stock reduced successfully',
      transactions: stockTransactions,
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (err) {
    console.error(`❌ [STOCK-REDUCE] Error reducing stock for order ${orderId}:`, err);
    console.error(`❌ [STOCK-REDUCE] Stack trace:`, err.stack);
    if (shouldCommit) {
      await t.rollback();
      console.error(`❌ [STOCK-REDUCE] Transaction rolled back for order ${orderId}`);
    }
    throw err;
  }
}

/**
 * Atomically restore stock for all variants in an order
 * @param {number} orderId - Order ID
 * @param {string} orderStatus - Current order status
 * @param {object} metadata - Additional metadata (refund ID, cancellation reason, etc.)
 * @param {object} transaction - Sequelize transaction (optional, for atomicity)
 * @returns {Promise<{success: boolean, message: string, transactions: Array}>}
 */
export async function restoreStockForOrder(orderId, orderStatus = 'cancelled', metadata = {}, transaction = null) {
  const t = transaction || await Order.sequelize.transaction();
  let shouldCommit = !transaction;

  try {
    console.log(`🚀 [STOCK-RESTORE] Starting stock restoration for order ${orderId}, status: ${orderStatus}`);
    
    // Idempotency check: Don't restore stock twice
    if (await hasStockBeenRestored(orderId)) {
      console.log(`ℹ️ [STOCK-RESTORE] Stock already restored for order ${orderId}, skipping (idempotent)`);
      if (shouldCommit) await t.rollback();
      return {
        success: true,
        message: 'Stock already restored (idempotent)',
        transactions: [],
        skipped: true,
      };
    }

    // Check if stock was ever reduced for this order (must check before transaction)
    // We check outside transaction first for idempotency
    const hasReduction = await hasStockBeenReduced(orderId);
    
    if (!hasReduction) {
      console.log(`ℹ️ [STOCK-RESTORE] No stock reduction found for order ${orderId}, nothing to restore`);
      if (shouldCommit) await t.rollback();
      return {
        success: true,
        message: 'No stock reduction found, nothing to restore',
        transactions: [],
        skipped: true,
      };
    }

    // Get reduction transactions for linking
    const reductionTransactions = await StockTransaction.findAll({
      where: {
        orderId,
        transactionType: 'reduce',
        isReversed: false,
      },
      transaction: t,
    });

    // ✅ CRITICAL FIX: Fetch order records first, then fetch variants directly with locking
    const orderRecords = await OrderRecord.findAll({
      where: { orderId },
      attributes: ['id', 'productVariantId', 'quantity'],
      transaction: t,
    });

    if (orderRecords.length === 0) {
      throw new Error(`No order records found for order ${orderId}`);
    }

    console.log(`📦 [STOCK-RESTORE] Processing ${orderRecords.length} order record(s) for order ${orderId}`);

    const stockTransactions = [];

    // ✅ Restore stock for each variant atomically with direct fetch and row-level locking
    for (const record of orderRecords) {
      const productVariantId = record.productVariantId;
      const quantityToRestore = Number(record.quantity) || 0;

      if (!productVariantId) {
        console.warn(`⚠️ [STOCK-RESTORE] ProductVariantId missing for order record ${record.id}`);
        continue;
      }

      if (quantityToRestore <= 0) {
        console.warn(`⚠️ [STOCK-RESTORE] Invalid quantity for order record ${record.id}: ${quantityToRestore}`);
        continue;
      }

      // ✅ CRITICAL FIX: Fetch variant directly with row-level lock (SELECT FOR UPDATE)
      const variant = await ProductVariant.findByPk(productVariantId, {
        transaction: t,
        lock: t.LOCK.UPDATE, // Row-level lock prevents concurrent modifications
      });

      if (!variant) {
        console.warn(`⚠️ [STOCK-RESTORE] Variant ${productVariantId} not found for order record ${record.id}`);
        continue;
      }

      const currentStock = Number(variant.stock) || 0;
      const newStock = currentStock + quantityToRestore;

      console.log(`🔍 [STOCK-RESTORE] Variant ${variant.id} (${variant.sku}): Current stock = ${currentStock}, Restoring = ${quantityToRestore}, New = ${newStock}`);

      // ✅ CRITICAL FIX: Use atomic SQL update with WHERE clause
      const [affectedRows] = await ProductVariant.update(
        { stock: newStock },
        {
          where: { id: productVariantId },
          transaction: t,
        }
      );

      if (affectedRows === 0) {
        throw new Error(`Failed to restore stock for variant ${productVariantId} - no rows affected`);
      }

      // ✅ Verify the update actually happened
      const verifyVariant = await ProductVariant.findByPk(productVariantId, {
        attributes: ['id', 'stock'],
        transaction: t,
      });

      if (!verifyVariant || Number(verifyVariant.stock) !== newStock) {
        throw new Error(`Stock restore verification failed for variant ${productVariantId}. Expected: ${newStock}, Got: ${verifyVariant?.stock}`);
      }

      console.log(`✅ [STOCK-RESTORE] Variant ${variant.id} (${variant.sku}): ${currentStock} → ${newStock} (Rows affected: ${affectedRows}, Verified: ${verifyVariant.stock})`);

      // Find the original reduction transaction to link
      const originalReduction = reductionTransactions.find(
        t => t.productVariantId === productVariantId
      );

      // Mark original reduction as reversed
      if (originalReduction) {
        await originalReduction.update({ isReversed: true }, { transaction: t });
      }

      // Create transaction record for audit
      const stockTransaction = await StockTransaction.create({
        orderId,
        productVariantId: variant.id,
        quantity: quantityToRestore, // Positive for restoration
        previousStock: currentStock,
        newStock,
        transactionType: 'restore',
        orderStatus,
        reversedByTransactionId: originalReduction?.id || null,
        metadata: {
          ...metadata,
          orderRecordId: record.id,
          originalReductionId: originalReduction?.id || null,
          affectedRows,
          verified: true,
        },
      }, { transaction: t });

      stockTransactions.push(stockTransaction);
    }

    if (shouldCommit) {
      await t.commit();
      console.log(`✅ [STOCK-RESTORE] Transaction committed for order ${orderId}. ${stockTransactions.length} stock transaction(s) created.`);
    }

    return {
      success: true,
      message: 'Stock restored successfully',
      transactions: stockTransactions,
    };

  } catch (err) {
    console.error(`❌ [STOCK-RESTORE] Error restoring stock for order ${orderId}:`, err);
    console.error(`❌ [STOCK-RESTORE] Stack trace:`, err.stack);
    if (shouldCommit) {
      await t.rollback();
      console.error(`❌ [STOCK-RESTORE] Transaction rolled back for order ${orderId}`);
    }
    throw err;
  }
}

/**
 * Handle stock changes based on order status transition
 * @param {number} orderId - Order ID
 * @param {string} oldStatus - Previous order status
 * @param {string} newStatus - New order status
 * @param {object} metadata - Additional metadata
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function handleOrderStatusTransition(orderId, oldStatus, newStatus, metadata = {}) {
  try {
    // Define valid transitions and their stock operations
    const transitions = {
      // Pending/Created -> Paid: Reduce stock
      'created->paid': { action: 'reduce', status: 'paid' },
      'pending->paid': { action: 'reduce', status: 'paid' },
      
      // Paid -> Cancelled/Refunded: Restore stock
      'paid->cancelled': { action: 'restore', status: 'cancelled' },
      'paid->refunded': { action: 'restore', status: 'refunded' },
      'paid->partially_refunded': { action: 'restore', status: 'partially_refunded' },
      
      // Paid -> Failed: Restore stock (if payment failed after being paid)
      'paid->failed': { action: 'restore', status: 'failed' },
    };

    const transitionKey = `${oldStatus}->${newStatus}`.toLowerCase();
    const transition = transitions[transitionKey];

    if (!transition) {
      // No stock operation needed for this transition
      return {
        success: true,
        message: `No stock operation needed for transition ${transitionKey}`,
        skipped: true,
      };
    }

    if (transition.action === 'reduce') {
      return await reduceStockForOrder(orderId, transition.status, metadata);
    } else if (transition.action === 'restore') {
      return await restoreStockForOrder(orderId, transition.status, metadata);
    }

    return {
      success: true,
      message: 'Transition handled',
    };

  } catch (err) {
    console.error(`❌ Error handling order status transition:`, err);
    throw err;
  }
}

/**
 * Get stock transaction history for an order
 * @param {number} orderId - Order ID
 * @returns {Promise<Array>} - Array of stock transactions
 */
export async function getStockTransactionHistory(orderId) {
  return await StockTransaction.findAll({
    where: { orderId },
    include: [
      {
        model: ProductVariant,
        as: 'variant',
        attributes: ['id', 'sku', 'productId'],
      },
    ],
    order: [['createdOnUTC', 'ASC']],
  });
}

