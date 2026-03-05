import { Order, OrderRecord, CustomerDetail, CustomerAddressDetail, ProductVariant, Product, UnitValue, Image, Payment } from "../../db/dbconnection.js";
import razorpay from "../../route/customer/razorpay.js";
import crypto from "crypto";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import { generateOrderPaymentLink } from "../../Helper/razorpay.payment.helper.js";
import { convertImageToBase64 } from "../../Helper/multer.helper.js";
import { Op } from "sequelize";
import { reduceStockForOrder, handleOrderStatusTransition } from "../../Helper/stockManagement.helper.js";

/**
 * Get Razorpay Public Key (Secure Endpoint)
 * GET /api/order/razorpay-key
 * Returns only the public key (key_id) - NEVER expose key_secret
 */
export const getRazorpayKey = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    
    if (!keyId) {
      console.error("❌ RAZORPAY_KEY_ID not configured");
      return sendError(res, "Payment gateway not configured", 500);
    }

    // Return only public key - NEVER expose key_secret
    return sendSuccess(res, { 
      keyId: keyId,
      // Include environment info for debugging (remove in production if needed)
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error("❌ GET RAZORPAY KEY ERROR:", err);
    return sendError(res, "Failed to retrieve payment gateway key", 500);
  }
};

// Stock management functions removed - now using stockManagement.helper.js

/**
 * Create Order
 * POST /api/order
 * reqData: { customerId, items: [{ productVariantId, quantity }] }
 */
export const createOrder = async (req, res) => {
  try {
    const reqData = req.body.reqData || req.body;
    const { customerId, items } = reqData;
    
    if (!customerId || !items?.length) {
      return sendError(res, "Customer ID and items are required", 400);
    }

    // Validate customer exists
    const customer = await CustomerDetail.findByPk(customerId);
    if (!customer) {
      return sendError(res, "Customer not found", 404);
    }

    if (!customer.razorpayCustomerId) {
      return sendError(res, "Customer does not have Razorpay ID", 400);
    }

    // Fetch product variants and validate
    const variantIds = items.map(i => i.productVariantId).filter(Boolean);
    if (variantIds.length !== items.length) {
      return sendError(res, "All items must have productVariantId", 400);
    }

    const variants = await ProductVariant.findAll({
      where: { 
        id: { [Op.in]: variantIds },
        isActive: true 
      },
      include: [
        { model: Product, as: "product" },
        { model: UnitValue, as: "unitValue" }
      ]
    });

    // Validate all variants exist and are active
    const missingVariants = items.filter(i => 
      !variants.find(v => v.id === i.productVariantId)
    );
    
    if (missingVariants.length > 0) {
      return sendError(res, `Product variants not found: ${missingVariants.map(v => v.productVariantId).join(', ')}`, 404);
    }

    // Calculate amount and validate stock
    let amount = 0;
    const enrichedItems = [];
    
    for (const item of items) {
      const variant = variants.find(v => v.id === item.productVariantId);
      if (!variant) continue;

      const quantity = Number(item.quantity) || 1;
      
      // Validate stock
      if (variant.stock < quantity) {
        return sendError(res, `Insufficient stock for variant ${variant.sku}. Available: ${variant.stock}, Requested: ${quantity}`, 400);
      }

      // Validate min/max order quantity
      if (variant.minOrderQuantity && quantity < variant.minOrderQuantity) {
        return sendError(res, `Minimum order quantity for ${variant.sku} is ${variant.minOrderQuantity}`, 400);
      }
      if (variant.maxOrderQuantity && quantity > variant.maxOrderQuantity) {
        return sendError(res, `Maximum order quantity for ${variant.sku} is ${variant.maxOrderQuantity}`, 400);
      }

      const price = Number(variant.price);
      const total = price * quantity;
      amount += total;
      
      enrichedItems.push({
        ...item,
        productVariantId: variant.id,
        productId: variant.productId,
        price,
        total,
        variantDetails: {
          name: `${variant.product?.name || ''} - ${variant.quantity}${variant.unitValue?.symbol || variant.unitValue?.name || ''}`,
          sku: variant.sku,
          unitValue: variant.unitValue?.name || '',
          unitSymbol: variant.unitValue?.symbol || ''
        }
      });
    }

    if (amount <= 0) {
      return sendError(res, "Order amount must be greater than 0", 400);
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${customerId}`,
      notes: { 
        customerId: String(customerId),
        internalCustomerId: String(customerId)
      }
    });

    // Create order in database
    const order = await Order.create({
      customerId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      paid_amount: 0,
      due_amount: amount,
      currency: "INR",
      receipt: razorpayOrder.receipt,
      status: "created",
      createdBy: req.user?.id || null,
      lastModifiedBy: req.user?.id || null
    });

    // Create order records
    const orderRecords = [];
    for (const item of enrichedItems) {
      const record = await OrderRecord.create({
        orderId: order.id,
        productVariantId: item.productVariantId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdBy: req.user?.id || null
      });
      
      orderRecords.push({
        ...record.toJSON(),
        variantDetails: item.variantDetails
      });
    }

    // Generate payment link
    const paymentLink = await generateOrderPaymentLink(order, customer, amount);

    // Prepare response
    const response = {
      order: {
        ...order.toJSON(),
        items: orderRecords,
        razorpayOrderId: razorpayOrder.id,
        customerDetails: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          contact: customer.contact
        }
      },
      paymentLink: {
        id: paymentLink.id,
        short_url: paymentLink.short_url,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        status: paymentLink.status,
        expire_by: paymentLink.expire_by,
        created_at: paymentLink.created_at
      }
    };

    return sendSuccess(res, response, 201);

  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err?.message || err);
    if (err?.error) console.error("❌ Razorpay error detail:", err.error);

    const message = err.message || "Internal server error";
    const isPaymentGatewayError =
      err.error?.code ||
      /payment gateway|payment link|razorpay|invalid access/i.test(message);

    return sendError(
      res,
      message,
      isPaymentGatewayError ? 400 : 500
    );
  }
};

/**
 * Verify Payment (Client-side callback)
 * POST /api/order/verify
 * reqData: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = async (req, res) => {
  try {
    const reqData = req.body.reqData || req.body;
    
    // Support both naming conventions (snake_case and camelCase)
    const razorpay_order_id = reqData.razorpay_order_id || reqData.razorpayOrderId;
    const razorpay_payment_id = reqData.razorpay_payment_id || reqData.razorpayPaymentId;
    const razorpay_signature = reqData.razorpay_signature || reqData.razorpaySignature;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required", 400);
    }

    // Security: Validate input format to prevent injection
    if (!/^order_[a-zA-Z0-9]+$/.test(razorpay_order_id)) {
      return sendError(res, "Invalid razorpay_order_id format", 400);
    }
    
    if (!/^pay_[a-zA-Z0-9]+$/.test(razorpay_payment_id)) {
      return sendError(res, "Invalid razorpay_payment_id format", 400);
    }

    // Find order (no need to include customer for verification)
    const order = await Order.findOne({ 
      where: { razorpayOrderId: razorpay_order_id }
    });
    
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return sendError(res, "Invalid payment signature", 400);
    }

    // Fetch payment details from Razorpay to validate amount
    let razorpayPayment;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (err) {
      console.error("Failed to fetch payment from Razorpay:", err);
      return sendError(res, "Failed to verify payment with Razorpay", 500);
    }

    // Validate amount (Razorpay amounts are in paise)
    const paidAmountPaise = razorpayPayment.amount;
    const expectedAmountPaise = Math.round(Number(order.amount) * 100);
    const isAmountValid = paidAmountPaise === expectedAmountPaise;

    // Check if payment already processed (idempotency)
    const { Payment } = await import("../../db/dbconnection.js");
    const existingPayment = await Payment.findOne({
      where: { razorpayPaymentId: razorpay_payment_id }
    });

    if (existingPayment && existingPayment.isProcessed) {
      // Return existing payment data (no need for customer details in verification)
      const existingOrder = await Order.findByPk(existingPayment.orderId, {
        include: [
          { model: OrderRecord, as: "items", include: [
            { 
              model: Product, 
              as: "product",
              attributes: ["id", "name", "description"]
            },
            { model: ProductVariant, as: "variant", include: [
              { model: Product, as: "product", attributes: ["id", "name", "description"] },
              { model: UnitValue, as: "unitValue" }
            ]}
          ]}
        ]
      });

      // Transform order items to include unitSymbol from unitValue
      let orderResponse = existingOrder;
      if (existingOrder) {
        const orderJson = existingOrder.toJSON();
        if (orderJson.items && Array.isArray(orderJson.items)) {
          orderJson.items = orderJson.items.map(item => {
            if (item.variant && item.variant.unitValue) {
              // Add denormalized unit fields for easier access
              item.variant.unitSymbol = item.variant.unitValue.symbol || item.variant.unitValue.name || '';
              item.variant.unitName = item.variant.unitValue.name || '';
            }
            return item;
          });
          orderResponse = orderJson;
        }
      }

      return sendSuccess(res, {
        message: "Payment already verified",
        order: orderResponse,
        payment: existingPayment
      });
    }

    // Create or update payment record
    // When payment is verified successfully, set status to "captured" (not just "authorized")
    const paymentStatusToSave = "captured"; // Payment is successful, so set to captured
    
    let payment;
    if (existingPayment) {
      payment = existingPayment;
    } else {
      payment = await Payment.create({
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderId: order.id,
        customerId: order.customerId,
        amount: order.amount,
        amountPaise: paidAmountPaise,
        currency: razorpayPayment.currency || "INR",
        status: paymentStatusToSave,
        method: razorpayPayment.method || null,
        signature: razorpay_signature,
        isAmountValid,
        isProcessed: false,
        metadata: {
          razorpayPayment: {
            status: razorpayPayment.status,
            method: razorpayPayment.method,
            email: razorpayPayment.email,
            contact: razorpayPayment.contact,
            originalRazorpayStatus: razorpayPayment.status // Store original status for reference
          }
        },
        createdBy: req.user?.id || null
      });
    }

    // Update order status
    // When payment is verified successfully, set order status to "paid"
    let orderStatus = "paid";
    if (!isAmountValid) {
      orderStatus = "flagged";
      console.warn(`⚠️ Amount mismatch for order ${order.id}. Expected: ${expectedAmountPaise} paise, Got: ${paidAmountPaise} paise`);
    }

    await order.update({
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      status: orderStatus,
      paid_amount: paidAmountPaise / 100,
      due_amount: Math.max(0, order.amount - (paidAmountPaise / 100)),
      lastModifiedBy: req.user?.id || null
    });

    // Mark payment as processed with captured status
    await payment.update({
      status: paymentStatusToSave,
      isProcessed: true,
      processedAt: new Date(),
      lastModifiedBy: req.user?.id || null
    });

    // ✅ Reduce stock atomically when payment is verified and order is paid
    // Only reduce stock if payment is valid and order status is paid
    if (orderStatus === "paid" && isAmountValid) {
      console.log(`🔄 [PAYMENT-VERIFY] Attempting stock reduction for order ${order.id}`);
      try {
        const stockResult = await reduceStockForOrder(
          order.id,
          orderStatus,
          {
            paymentId: razorpay_payment_id,
            verifiedBy: 'client_callback',
            isAmountValid,
          }
        );
        
        if (stockResult.skipped) {
          console.log(`ℹ️ [PAYMENT-VERIFY] Stock reduction skipped: ${stockResult.message}`);
        } else if (!stockResult.success && stockResult.errors) {
          console.error(`⚠️ [PAYMENT-VERIFY] Stock reduction completed with warnings:`, stockResult.errors);
        } else {
          console.log(`✅ [PAYMENT-VERIFY] Stock reduction successful: ${stockResult.message}`);
        }
      } catch (stockErr) {
        console.error(`❌ [PAYMENT-VERIFY] CRITICAL: Error reducing stock during payment verification:`, stockErr);
        console.error(`❌ [PAYMENT-VERIFY] Stack:`, stockErr.stack);
        // Don't fail the payment verification if stock reduction fails
        // Stock can be adjusted manually later
      }
    } else {
      console.log(`ℹ️ [PAYMENT-VERIFY] Skipping stock reduction - Order status: ${orderStatus}, Amount valid: ${isAmountValid}`);
    }

    // Fetch complete order with items (no need for customer details in verification response)
    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { 
          model: OrderRecord, 
          as: "items",
          include: [
            { 
              model: Product, 
              as: "product",
              attributes: ["id", "name", "description"]
            },
            { 
              model: ProductVariant, 
              as: "variant",
              include: [
                { model: Product, as: "product", attributes: ["id", "name", "description"] },
                { model: UnitValue, as: "unitValue" }
              ]
            }
          ]
        }
      ]
    });

    // Transform order items to include unitSymbol from unitValue
    let orderResponse = updatedOrder;
    if (updatedOrder) {
      const orderJson = updatedOrder.toJSON();
      if (orderJson.items && Array.isArray(orderJson.items)) {
        orderJson.items = orderJson.items.map(item => {
          if (item.variant && item.variant.unitValue) {
            // Add denormalized unit fields for easier access
            item.variant.unitSymbol = item.variant.unitValue.symbol || item.variant.unitValue.name || '';
            item.variant.unitName = item.variant.unitValue.name || '';
          }
          return item;
        });
        orderResponse = orderJson;
      }
    }

    return sendSuccess(res, {
      message: "Payment verified successfully",
      order: orderResponse,
      payment: payment,
      isAmountValid
    });

  } catch (err) {
    console.error("❌ VERIFY PAYMENT ERROR:", err);
    return sendError(res, err.message || "Internal server error");
  }
};

/**
 * Get All Orders (with pagination, filtering, and search)
 * GET /api/order?skip=0&top=10&status=paid&customerId=1&startDate=2024-01-01&endDate=2024-01-31&search=ORD-123
 */
export const getAllOrders = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 10;
    const status = req.query.status;
    const customerId = req.query.customerId ? parseInt(req.query.customerId, 10) : null;
    const customerName = req.query.customerName ? req.query.customerName.trim() : null;
    const customerEmail = req.query.customerEmail ? req.query.customerEmail.trim() : null;
    const startDate = req.query.startDate ? new Date(req.query.startDate + 'T00:00:00.000Z') : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate + 'T23:59:59.999Z') : null;
    const search = req.query.search ? req.query.search.trim() : null;
    const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount) : null;
    const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount) : null;

    const where = {};
    let customerIncludeCondition = null;
    
    // Status filter
    if (status) {
      where.status = status;
    }

    // Customer filter - by ID, Name, or Email
    if (customerId && !isNaN(customerId)) {
      where.customerId = customerId;
    } else if (customerEmail) {
      // Filter by customer email
      customerIncludeCondition = {
        model: CustomerDetail,
        as: "customer",
        where: {
          email: { [Op.iLike]: customerEmail }
        },
        required: true
      };
    } else if (customerName) {
      // Filter by customer name (firstName or lastName)
      customerIncludeCondition = {
        model: CustomerDetail,
        as: "customer",
        where: {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${customerName}%` } },
            { lastName: { [Op.iLike]: `%${customerName}%` } }
          ]
        },
        required: true
      };
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdOnUTC = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.createdOnUTC = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.createdOnUTC = {
        [Op.lte]: endDate
      };
    }

    // Amount range filter
    if (minAmount !== null || maxAmount !== null) {
      where.amount = {};
      if (minAmount !== null) {
        where.amount[Op.gte] = minAmount;
      }
      if (maxAmount !== null) {
        where.amount[Op.lte] = maxAmount;
      }
    }

    // Search filter (by order ID, Razorpay order ID, or receipt)
    if (search) {
      where[Op.or] = [
        { id: isNaN(parseInt(search, 10)) ? null : parseInt(search, 10) },
        { razorpayOrderId: { [Op.iLike]: `%${search}%` } },
        { receipt: { [Op.iLike]: `%${search}%` } }
      ].filter(condition => {
        // Remove null conditions
        if (condition.id === null) return false;
        return true;
      });
    }

    // Build include array
    const includes = [
      { 
        model: OrderRecord, 
        as: "items",
        required: false,
        include: [
          { 
            model: Product, 
            as: "product",
            attributes: ["id", "name", "description"],
            include: [
              { 
                model: Image, 
                as: "images",
                attributes: ["imagePath"],
                required: false
              }
            ]
          },
          { 
            model: ProductVariant, 
            as: "variant",
            include: [
              { model: Product, as: "product", attributes: ["id", "name", "description"] },
              { model: UnitValue, as: "unitValue" }
            ]
          }
        ]
      },
      {
        model: Payment,
        as: "payments",
        required: false,
        limit: 1,
        order: [["createdOnUTC", "DESC"]]
      }
    ];

    // Add customer include (with condition if filtering by name)
    if (customerIncludeCondition) {
      includes.push(customerIncludeCondition);
    } else {
      includes.push({ 
        model: CustomerDetail, 
        as: "customer",
        required: false
      });
    }

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where,
      offset: skip,
      limit: top,
      include: includes,
      order: [["createdOnUTC", "DESC"]],
      distinct: true // Important for count with joins
    });

    // Transform orders to plain objects (arrays) and ensure amount is properly converted
    const ordersData = orders.map(order => {
      const orderJson = order.toJSON();
      // Ensure amount is a number (DECIMAL fields can be strings)
      if (orderJson.amount) {
        orderJson.amount = parseFloat(orderJson.amount);
      }
      if (orderJson.paid_amount) {
        orderJson.paid_amount = parseFloat(orderJson.paid_amount);
      }
      if (orderJson.due_amount) {
        orderJson.due_amount = parseFloat(orderJson.due_amount);
      }
      
      // Transform order items to include unitSymbol from unitValue and convert images to base64
      if (orderJson.items && Array.isArray(orderJson.items)) {
        orderJson.items = orderJson.items.map(item => {
          if (item.variant && item.variant.unitValue) {
            // Add denormalized unit fields for easier access
            item.variant.unitSymbol = item.variant.unitValue.symbol || item.variant.unitValue.name || '';
            item.variant.unitName = item.variant.unitValue.name || '';
          }
          // Convert product images to base64
          if (item.product && item.product.images && Array.isArray(item.product.images)) {
            item.product.images = item.product.images.map(img => convertImageToBase64(img.imagePath)).filter(Boolean);
          }
          return item;
        });
      }
      
      return orderJson;
    });

    // Return orders with pagination metadata
    return sendSuccess(res, {
      data: ordersData,
      total: total,
      skip: skip,
      top: top,
      hasMore: (skip + top) < total
    });
  } catch (err) {
    console.error("❌ GET ALL ORDERS ERROR:", err);
    return sendError(res, err.message);
  }
};

/**
 * Get Order By ID
 * GET /api/order/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    if (!orderId || isNaN(orderId)) {
      return sendError(res, "Invalid order ID", 400);
    }

    // Build includes array
    const includes = [
      { 
        model: OrderRecord, 
        as: "items",
        required: false,
        include: [
          { 
            model: Product, 
            as: "product",
            attributes: ["id", "name", "description"],
            required: false
          },
          { 
            model: ProductVariant, 
            as: "variant",
            required: false,
            include: [
              { model: Product, as: "product", attributes: ["id", "name", "description"], required: false },
              { model: UnitValue, as: "unitValue", required: false }
            ]
          }
        ]
      },
      {
        model: Payment,
        as: "payments",
        required: false,
        limit: 1,
        order: [["createdOnUTC", "DESC"]]
      }
    ];

    // Add customer include - try to include addresses if model is available
    const customerInclude = {
      model: CustomerDetail,
      as: "customer",
      required: false
    };

    // Try to include addresses - handle case where CustomerAddressDetail might not be loaded
    try {
      if (CustomerAddressDetail) {
        customerInclude.include = [
          {
            model: CustomerAddressDetail,
            as: "addresses",
            required: false
          }
        ];
      }
    } catch (includeErr) {
      // If CustomerAddressDetail is not available, just skip addresses
      console.warn("⚠️ CustomerAddressDetail not available, skipping addresses in order details");
    }

    includes.push(customerInclude);

    const order = await Order.findByPk(orderId, {
      include: includes
    });
    
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // Transform order to include unitSymbol from unitValue
    const orderJson = order.toJSON();
    if (orderJson.items && Array.isArray(orderJson.items)) {
      orderJson.items = orderJson.items.map(item => {
        if (item.variant && item.variant.unitValue) {
          // Add denormalized unit fields for easier access
          item.variant.unitSymbol = item.variant.unitValue.symbol || item.variant.unitValue.name || '';
          item.variant.unitName = item.variant.unitValue.name || '';
        }
        return item;
      });
    }

    return sendSuccess(res, orderJson);
  } catch (err) {
    console.error("❌ GET ORDER BY ID ERROR:", err);
    return sendError(res, err.message || "Failed to fetch order details");
  }
};

/**
 * Update Order Status
 * PUT /api/order/:id/status
 * reqData: { status: "paid" | "failed" | "refunded" | etc., reason?: string }
 * 
 * ✅ Handles stock management based on status transitions:
 * - Pending/Created -> Paid: Reduces stock
 * - Paid -> Cancelled/Refunded/Failed: Restores stock
 */
export const updateOrderStatus = async (req, res) => {
  const t = await Order.sequelize.transaction();
  
  try {
    const orderId = parseInt(req.params.id, 10);
    const reqData = req.body.reqData || req.body;
    const { status, reason } = reqData;

    if (!orderId || isNaN(orderId)) {
      await t.rollback();
      return sendError(res, "Invalid order ID", 400);
    }

    const validStatuses = ["created", "paid", "failed", "flagged", "refunded", "partially_refunded", "payment_pending", "shipped", "delivered", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      await t.rollback();
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const order = await Order.findByPk(orderId, { transaction: t });
    
    if (!order) {
      await t.rollback();
      return sendError(res, "Order not found", 404);
    }

    const oldStatus = order.status;
    const newStatus = status;

    // Update order status
    await order.update({
      status: newStatus,
      lastModifiedBy: req.user?.id || null
    }, { transaction: t });

    // ✅ Handle stock management based on status transition
    // NOTE: Stock operations use their own transaction for atomicity
    // We handle stock AFTER committing the order status update to avoid transaction conflicts
    await t.commit();
    console.log(`✅ [ORDER-STATUS-UPDATE] Order status updated to ${newStatus} for order ${orderId}`);
    
    console.log(`🔄 [ORDER-STATUS-UPDATE] Handling stock transition for order ${orderId}: ${oldStatus} → ${newStatus}`);
    let stockResult = null;
    try {
      stockResult = await handleOrderStatusTransition(
        orderId,
        oldStatus,
        newStatus,
        {
          updatedBy: req.user?.id || null,
          reason: reason || null,
          updatedVia: 'admin_status_update',
        }
      );
      
      if (stockResult.skipped) {
        console.log(`ℹ️ [ORDER-STATUS-UPDATE] Stock transition skipped: ${stockResult.message}`);
      } else {
        console.log(`✅ [ORDER-STATUS-UPDATE] Stock transition successful: ${stockResult.message}`);
      }
    } catch (stockErr) {
      console.error(`❌ [ORDER-STATUS-UPDATE] CRITICAL: Error handling stock transition:`, stockErr);
      console.error(`❌ [ORDER-STATUS-UPDATE] Stack:`, stockErr.stack);
      // Log error but don't fail the status update
      // Stock can be adjusted manually if needed
    }

    return sendSuccess(res, {
      message: "Order status updated successfully",
      order: await Order.findByPk(orderId, {
        include: [
          { model: OrderRecord, as: "items" },
          { model: CustomerDetail, as: "customer" }
        ]
      }),
      stockUpdate: stockResult ? {
        success: stockResult.success,
        message: stockResult.message,
        skipped: stockResult.skipped || false,
      } : null,
    });

  } catch (err) {
    if (t && !t.finished) {
      await t.rollback();
      console.error(`❌ [ORDER-STATUS-UPDATE] Transaction rolled back due to error`);
    }
    console.error("❌ [ORDER-STATUS-UPDATE] UPDATE ORDER STATUS ERROR:", err);
    console.error("❌ [ORDER-STATUS-UPDATE] Stack:", err.stack);
    return sendError(res, err.message || "Failed to update order status", 500);
  }
};

/**
 * Validate Stock Availability
 * POST /api/order/validate-stock
 * reqData: { items: [{ productVariantId, quantity }] }
 * Returns stock availability for each item
 */
export const validateStock = async (req, res) => {
  try {
    const reqData = req.body.reqData || req.body;
    const { items } = reqData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, "Items array is required", 400);
    }

    const variantIds = items.map(i => i.productVariantId).filter(Boolean);
    if (variantIds.length !== items.length) {
      return sendError(res, "All items must have productVariantId", 400);
    }

    // Fetch variants
    const variants = await ProductVariant.findAll({
      where: {
        id: { [Op.in]: variantIds },
        isActive: true,
      },
      include: [
        { model: Product, as: "product", attributes: ["id", "name"] },
        { model: UnitValue, as: "unitValue" },
      ],
    });

    const validationResults = items.map(item => {
      const variant = variants.find(v => v.id === item.productVariantId);
      const requestedQuantity = Number(item.quantity) || 0;

      if (!variant) {
        return {
          productVariantId: item.productVariantId,
          available: false,
          error: "Variant not found or inactive",
          availableStock: 0,
          requestedQuantity,
        };
      }

      const availableStock = Number(variant.stock) || 0;
      const isAvailable = availableStock >= requestedQuantity;

      // Check min/max order quantity
      const minOrderQuantity = variant.minOrderQuantity || 1;
      const maxOrderQuantity = variant.maxOrderQuantity;
      const isValidQuantity = requestedQuantity >= minOrderQuantity && 
                             (!maxOrderQuantity || requestedQuantity <= maxOrderQuantity);

      return {
        productVariantId: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        productName: variant.product?.name || "",
        available: isAvailable && isValidQuantity,
        availableStock,
        requestedQuantity,
        minOrderQuantity,
        maxOrderQuantity,
        isValidQuantity,
        errors: [
          ...(availableStock < requestedQuantity ? [`Insufficient stock. Available: ${availableStock}`] : []),
          ...(requestedQuantity < minOrderQuantity ? [`Minimum order quantity is ${minOrderQuantity}`] : []),
          ...(maxOrderQuantity && requestedQuantity > maxOrderQuantity ? [`Maximum order quantity is ${maxOrderQuantity}`] : []),
        ],
      };
    });

    const allAvailable = validationResults.every(r => r.available);

    return sendSuccess(res, {
      allAvailable,
      items: validationResults,
    });

  } catch (err) {
    console.error("❌ VALIDATE STOCK ERROR:", err);
    return sendError(res, err.message || "Failed to validate stock", 500);
  }
};

/**
 * Get Orders By Customer ID
 * GET /api/order/customer/:customerId?skip=0&top=10&status=paid
 */
export const getOrdersByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    const skip = parseInt(req.query.skip, 10) || 0;
    const top = parseInt(req.query.top, 10) || 10;
    const status = req.query.status;

    // Validate customer exists
    const customer = await CustomerDetail.findByPk(customerId);
    if (!customer) {
      return sendError(res, "Customer not found", 404);
    }

    const where = { customerId: parseInt(customerId) };
    if (status) {
      where.status = status;
    }

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where,
      offset: skip,
      limit: top,
      include: [
        { 
          model: OrderRecord, 
          as: "items",
          include: [
            { 
              model: ProductVariant, 
              as: "variant",
              include: [
                { model: Product, as: "product" },
                { model: UnitValue, as: "unitValue" }
              ]
            }
          ]
        },
        { model: CustomerDetail, as: "customer" }
      ],
      order: [["createdOnUTC", "DESC"]]
    });

    return sendSuccess(res, {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email
      },
      total,
      skip,
      top,
      data: orders
    });
  } catch (err) {
    console.error("❌ GET ORDERS BY CUSTOMER ID ERROR:", err);
    return sendError(res, err.message);
  }
};
