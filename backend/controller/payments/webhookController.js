import express from "express";
import crypto from "crypto";
import { Order, Payment, WebhookLog, OrderRecord, ProductVariant } from "../../db/dbconnection.js";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import { reduceStockForOrder, restoreStockForOrder, handleOrderStatusTransition } from "../../Helper/stockManagement.helper.js";

const router = express.Router();

/**
 * Razorpay Webhook Handler
 * POST /api/v1/webhooks
 * Handles payment.captured, order.paid, payment.failed events
 * Verifies HMAC signature before processing
 */
router.post("/", async (req, res) => {
  const startTime = Date.now();
  let webhookLog = null;

  try {
    // Get raw body (must be raw for signature verification)
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    if (!rawBody || rawBody.length === 0) {
      return sendError(res, "Empty webhook body", 400);
    }

    // Get signature from headers
    const receivedSignature = req.headers["x-razorpay-signature"] || 
                             req.headers["X-Razorpay-Signature"];

    if (!receivedSignature) {
      return sendError(res, "Missing x-razorpay-signature header", 400);
    }

    // Compute expected signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ RAZORPAY_WEBHOOK_SECRET not configured");
      return sendError(res, "Webhook secret not configured", 500);
    }

    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Verify signature
    const isSignatureValid = receivedSignature === computedSignature;

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return sendError(res, "Invalid JSON payload", 400);
    }

    const { event, payload: eventPayload } = payload;

    if (!event || !eventPayload) {
      return sendError(res, "Invalid webhook payload structure", 400);
    }

    // Extract IDs from payload
    const razorpayOrderId = eventPayload.order?.entity?.id || 
                           eventPayload.payment?.entity?.order_id || 
                           null;
    const razorpayPaymentId = eventPayload.payment?.entity?.id || null;

    // Create webhook log entry
    webhookLog = await WebhookLog.create({
      event,
      rawBody,
      headers: req.headers,
      receivedSignature,
      computedSignature,
      isSignatureValid,
      status: isSignatureValid ? "processed" : "invalid",
      razorpayOrderId,
      razorpayPaymentId,
      errorMessage: isSignatureValid ? null : "Invalid signature",
      processingTimeMs: Date.now() - startTime
    });

    // Reject if signature invalid
    if (!isSignatureValid) {
      console.error("❌ Invalid webhook signature", {
        event,
        received: receivedSignature.substring(0, 20) + "...",
        computed: computedSignature.substring(0, 20) + "..."
      });
      return sendError(res, "Invalid webhook signature", 400);
    }

    // Process event based on type
    let processingResult = { processed: false, message: "Event ignored" };

    switch (event) {
      case "payment.captured":
      case "order.paid":
        processingResult = await handlePaymentCaptured(eventPayload, event);
        break;

      case "payment.failed":
        processingResult = await handlePaymentFailed(eventPayload);
        break;

      case "payment.authorized":
        processingResult = await handlePaymentAuthorized(eventPayload);
        break;

      case "refund.created":
      case "refund.processed":
        processingResult = await handleRefundProcessed(eventPayload);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event}`);
        processingResult = { processed: false, message: `Unhandled event: ${event}` };
    }

    // Update webhook log
    await webhookLog.update({
      status: processingResult.processed ? "processed" : "ignored",
      errorMessage: processingResult.error || null,
      processingTimeMs: Date.now() - startTime
    });

    return sendSuccess(res, {
      success: true,
      event,
      processed: processingResult.processed,
      message: processingResult.message
    });

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);

    // Update webhook log if created
    if (webhookLog) {
      try {
        await webhookLog.update({
          status: "error",
          errorMessage: err.message,
          processingTimeMs: Date.now() - startTime
        });
      } catch (logErr) {
        console.error("Failed to update webhook log:", logErr);
      }
    }

    return sendError(res, err.message || "Webhook processing failed", 500);
  }
});

/**
 * Handle payment.captured / order.paid events
 */
async function handlePaymentCaptured(eventPayload, event) {
  try {
    const paymentEntity = eventPayload.payment?.entity;
    const orderEntity = eventPayload.order?.entity;

    if (!paymentEntity || !orderEntity) {
      return { processed: false, message: "Missing payment or order entity" };
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = orderEntity.id;
    const amountPaise = paymentEntity.amount;
    const paymentStatus = paymentEntity.status;

    // 🔍 Find order
    const order = await Order.findOne({ where: { razorpayOrderId } });

    if (!order) {
      console.warn(`⚠️ Order not found for razorpayOrderId: ${razorpayOrderId}`);
      return { processed: false, message: "Order not found" };
    }

    // 🛑 Idempotency check
    const existingPayment = await Payment.findOne({
      where: { razorpayPaymentId }
    });

    if (existingPayment?.isProcessed) {
      console.log(`ℹ️ Payment ${razorpayPaymentId} already processed`);
      return { processed: false, message: "Payment already processed" };
    }

    // 💰 Amount validation
    const expectedAmountPaise = Math.round(Number(order.amount) * 100);
    const isAmountValid = amountPaise === expectedAmountPaise;

    // 💾 Create / Update payment
    // When payment is successful (payment.captured or order.paid event), set status to "captured"
    const paymentStatusToSave = "captured"; // Payment is successful, so set to captured
    
    const paymentData = {
      razorpayPaymentId,
      razorpayOrderId,
      orderId: order.id,
      customerId: order.customerId,
      amount: order.amount,
      amountPaise,
      currency: paymentEntity.currency || "INR",
      status: paymentStatusToSave,
      method: paymentEntity.method || null,
      isAmountValid,
      isProcessed: true,
      processedAt: new Date(),
      metadata: {
        razorpayPayment: paymentEntity,
        razorpayOrder: orderEntity,
        event,
        originalRazorpayStatus: paymentStatus // Store original status for reference
      }
    };

    let payment;
    if (existingPayment) {
      payment = await existingPayment.update(paymentData);
    } else {
      payment = await Payment.create(paymentData);
    }

    // 📌 Decide order status
    // When payment is successful, set order status to "paid"
    let orderStatus;

    if (!isAmountValid) {
      orderStatus = "flagged";
      console.warn(
        `⚠️ Amount mismatch for order ${order.id}. Expected: ${expectedAmountPaise}, Got: ${amountPaise}`
      );
    } else {
      // Payment is successful, so set order status to "paid"
      orderStatus = "paid";
    }

    // 🔒 Update order only once
    if (!["paid", "flagged"].includes(order.status)) {
      const oldStatus = order.status;
      
      await order.update({
        paymentId: razorpayPaymentId,
        status: orderStatus,
        paid_amount: amountPaise / 100,
        due_amount: Math.max(0, order.amount - amountPaise / 100),
        lastModifiedBy: null
      });

      // ✅ Handle stock management based on status transition
      // Only reduce stock when order transitions to "paid"
      if (orderStatus === "paid") {
        console.log(`🔄 [WEBHOOK] Attempting stock reduction for order ${order.id} (event: ${event})`);
        try {
          const stockResult = await reduceStockForOrder(
            order.id,
            orderStatus,
            {
              paymentId: razorpayPaymentId,
              razorpayOrderId,
              webhookEvent: event,
              isAmountValid,
            }
          );
          
          if (stockResult.skipped) {
            console.log(`ℹ️ [WEBHOOK] Stock reduction skipped: ${stockResult.message}`);
          } else if (!stockResult.success && stockResult.errors) {
            console.error(`⚠️ [WEBHOOK] Stock reduction completed with warnings:`, stockResult.errors);
          } else {
            console.log(`✅ [WEBHOOK] Stock reduction successful: ${stockResult.message}`);
          }
        } catch (stockErr) {
          console.error(`❌ [WEBHOOK] CRITICAL: Error reducing stock in webhook:`, stockErr);
          console.error(`❌ [WEBHOOK] Stack:`, stockErr.stack);
          // Don't fail webhook processing if stock reduction fails
        }
      } else {
        console.log(`ℹ️ [WEBHOOK] Skipping stock reduction - Order status: ${orderStatus}`);
      }
    }

    return {
      processed: true,
      message: `Payment captured successfully (status: paid)`,
      paymentId: payment.id,
      orderId: order.id,
      isAmountValid
    };

  } catch (err) {
    console.error("❌ Error handling payment captured:", err);
    return { processed: false, error: err.message };
  }
}


/**
 * Handle payment.failed event
 * ✅ Restores stock if order was previously paid
 */
async function handlePaymentFailed(eventPayload) {
  try {
    const paymentEntity = eventPayload.payment?.entity;
    if (!paymentEntity) {
      return { processed: false, message: "Missing payment entity" };
    }

    const razorpayOrderId = paymentEntity.order_id;
    const order = await Order.findOne({
      where: { razorpayOrderId }
    });

    if (order && order.status !== "failed") {
      const oldStatus = order.status;
      
      await order.update({
        status: "failed",
        lastModifiedBy: null
      });

      // ✅ Restore stock if order was previously paid
      if (oldStatus === "paid") {
        console.log(`🔄 [WEBHOOK-FAILED] Attempting stock restoration for order ${order.id}`);
        try {
          const stockResult = await restoreStockForOrder(
            order.id,
            "failed",
            {
              paymentId: paymentEntity.id,
              razorpayOrderId,
              webhookEvent: "payment.failed",
              reason: "Payment failed after being paid",
            }
          );
          
          if (stockResult.skipped) {
            console.log(`ℹ️ [WEBHOOK-FAILED] Stock restoration skipped: ${stockResult.message}`);
          } else {
            console.log(`✅ [WEBHOOK-FAILED] Stock restoration successful: ${stockResult.message}`);
          }
        } catch (stockErr) {
          console.error(`❌ [WEBHOOK-FAILED] CRITICAL: Error restoring stock for failed payment:`, stockErr);
          console.error(`❌ [WEBHOOK-FAILED] Stack:`, stockErr.stack);
        }
      } else {
        console.log(`ℹ️ [WEBHOOK-FAILED] Skipping stock restoration - Order was not paid (status: ${oldStatus})`);
      }
    }

    return { processed: true, message: "Payment failure recorded" };
  } catch (err) {
    console.error("❌ Error handling payment failed:", err);
    return { processed: false, error: err.message };
  }
}

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(eventPayload) {
  try {
    const paymentEntity = eventPayload.payment?.entity;
    if (!paymentEntity) {
      return { processed: false, message: "Missing payment entity" };
    }

    // Payment authorized but not yet captured
    // We can log this but don't mark order as paid yet
    console.log(`ℹ️ Payment authorized: ${paymentEntity.id}`);
    
    return { processed: true, message: "Payment authorization logged" };
  } catch (err) {
    console.error("❌ Error handling payment authorized:", err);
    return { processed: false, error: err.message };
  }
}

// Stock management functions removed - now using stockManagement.helper.js

/**
 * Handle refund processed event
 * ✅ Restores stock when order is fully refunded
 */
async function handleRefundProcessed(eventPayload) {
  try {
    const refundEntity = eventPayload.refund?.entity;
    const paymentEntity = eventPayload.payment?.entity;
    
    if (!refundEntity || !paymentEntity) {
      return { processed: false, message: "Missing refund or payment entity" };
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayRefundId = refundEntity.id;
    const refundAmount = refundEntity.amount / 100; // Convert from paise

    // Find payment to get order
    const payment = await Payment.findOne({
      where: { razorpayPaymentId }
    });

    if (!payment) {
      console.warn(`⚠️ Payment not found for razorpayPaymentId: ${razorpayPaymentId}`);
      return { processed: false, message: "Payment not found" };
    }

    // Find order
    const order = await Order.findByPk(payment.orderId);
    if (!order) {
      console.warn(`⚠️ Order not found for orderId: ${payment.orderId}`);
      return { processed: false, message: "Order not found" };
    }

    // Update order status to refunded or partially_refunded
    const isFullRefund = refundAmount >= order.amount;
    const newStatus = isFullRefund ? "refunded" : "partially_refunded";
    
    if (order.status !== "refunded" && order.status !== "partially_refunded") {
      const oldStatus = order.status;
      
      await order.update({
        status: newStatus,
        lastModifiedBy: null // System update
      });

      // ✅ Restore stock when order is refunded (full refund only)
      // For partial refunds, you may want different logic (e.g., restore partial quantity)
      if (isFullRefund && oldStatus === "paid") {
        console.log(`🔄 [WEBHOOK-REFUND] Attempting stock restoration for order ${order.id} (full refund)`);
        try {
          const stockResult = await restoreStockForOrder(
            order.id,
            newStatus,
            {
              paymentId: razorpayPaymentId,
              refundId: razorpayRefundId,
              refundAmount,
              webhookEvent: event,
              isFullRefund,
            }
          );
          
          if (stockResult.skipped) {
            console.log(`ℹ️ [WEBHOOK-REFUND] Stock restoration skipped: ${stockResult.message}`);
          } else {
            console.log(`✅ [WEBHOOK-REFUND] Stock restoration successful: ${stockResult.message}`);
          }
        } catch (stockErr) {
          console.error(`❌ [WEBHOOK-REFUND] CRITICAL: Error restoring stock for refund:`, stockErr);
          console.error(`❌ [WEBHOOK-REFUND] Stack:`, stockErr.stack);
        }
      } else {
        console.log(`ℹ️ [WEBHOOK-REFUND] Skipping stock restoration - Full refund: ${isFullRefund}, Old status: ${oldStatus}`);
      }
    }

    return {
      processed: true,
      message: `Refund processed: ${isFullRefund ? 'Full' : 'Partial'} refund of ₹${refundAmount}`,
      orderId: order.id,
      refundAmount
    };

  } catch (err) {
    console.error("❌ Error handling refund processed:", err);
    return { processed: false, error: err.message };
  }
}

export default router;

