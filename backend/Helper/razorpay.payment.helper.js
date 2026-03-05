// helpers/paymentLink.helper.js
import razorpay from "../route/customer/razorpay.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate payment link for an order
 * @param {Object} order - Order object from database
 * @param {Object} customer - Customer object from database
 * @param {number} amount - Order amount
 * @returns {Promise<Object>} Razorpay payment link response
 */

// Resolve callback URL based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";

const CALLBACK_URL = isProduction
  ? process.env.CALL_BACK_URL_PROD
  : process.env.CALL_BACK_URL_Dev;

if (!CALLBACK_URL) {
  throw new Error("CALL_BACK_URL_PROD or CALL_BACK_URL_Dev is not defined in environment variables");
}

export const generateOrderPaymentLink = async (order, customer, amount) => {
  try {
    // Calculate expire_by as current time + 16 minutes (to ensure it's at least 15 minutes in future)
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const expireBy = currentTimeInSeconds + (16 * 60); // 16 minutes from now

    const options = {
      amount: Math.round(amount * 100), // Convert to paise for Razorpay
      currency: "INR",
      callback_url: `${CALLBACK_URL}/checkout/success`,
      callback_method: "get",
      customer: {
        id: customer.razorpayCustomerId
      },
      description: `Order #${order.id} Payment`,
      expire_by: expireBy,
      reference_id: order.razorpayOrderId,
      notes: {
        orderId: order.id,
        customerId: customer.id,
        razorpayOrderId: order.razorpayOrderId,
        internalOrderId: order.id
      }
    };

    console.log("🕒 Payment Link Options:", {
      amount: options.amount,
      expire_by: expireBy,
      current_time: currentTimeInSeconds,
      difference_minutes: (expireBy - currentTimeInSeconds) / 60
    });

    console.log("🧭 NODE_ENV:", process.env.NODE_ENV);
    console.log("🔁 Using CALLBACK URL:", options.callback_url);

    const paymentLink = await razorpay.paymentLink.create(options);
    return paymentLink;

  } catch (error) {
    const statusCode = error.statusCode || error.status;
    const description = error.error?.description || error.description || error.message || "Unknown error";
    const code = error.error?.code;

    console.error("❌ PAYMENT LINK GENERATION ERROR:", {
      statusCode,
      code,
      description,
      full: error.error || error
    });

    const isLiveModeDisabled = /live mode is disabled|livemode|cannot create.*live/i.test(description);
    const isFeatureNotEnabled = /not enabled|enable.*account|500|feature/i.test(description);

    let msg = `Payment gateway error: ${description}`;
    if (isLiveModeDisabled) {
      msg += " Use test keys in production until live mode is enabled, or enable live mode in Razorpay Dashboard.";
    } else if (isFeatureNotEnabled || statusCode === 500) {
      msg += " If this persists, ensure Payment Links are enabled for your Razorpay account (contact Razorpay support).";
    }

    throw new Error(msg);
  }
};
