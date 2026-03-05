import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// =======================
// Model Imports
// =======================
import createUserModel from "../model/userModel.js";
import createLicenseModel from "../model/licences.model.js";
import createModuleModel from "../model/module.model.js";
import createBannerModel from "../model/banner.model.js";
import createCategoryModel from "../model/category.model.js";
import createProductModel from "../model/product.model.js";
import createImageModel from "../model/image.model.js";
import createUnitValueModel from "../model/unitValue.model.js";
import createProductVariantModel from "../model/productVariant.model.js";
import customerAddressDetailModel from "../model/customerAddressDetail.model.js";
import createProductPaymentModel from "../model/productpayment.model.js";
import customerDetailModel from "../model/customerDetail.model.js";
import ContactUsModel from "../model/contactUs.model.js";
import createReviewModel from "../model/review.model.js";
import createTestimonialModel from "../model/testmonials.model.js";
import createVideoModel from "../model/video.model.js";
import createOrderModel from "../model/order.model.js";
import createOrderRecordModel from "../model/orderRecord.model.js";
import createPaymentModel from "../model/payment.model.js";
import createWebhookLogModel from "../model/webhookLog.model.js";
import createErrorLogModel from "../model/errorLog.model.js";
import createVisitorLogModel from "../model/visitorLog.model.js";
import createStockTransactionModel from "../model/stockTransaction.model.js";

// =======================
// Model Holders
// =======================
let User,
  License,
  Module,
  Banner,
  categories,
  Product,
  Image,
  UnitValue,
  ProductVariant,
  CustomerDetail,
  CustomerAddressDetail,
  ProductPayment,
  ContactUs,
  Review,
  Testimonial,
  Video,
  Order,
  OrderRecord,
  Payment,
  WebhookLog,
  ErrorLog,
  VisitorLog,
  StockTransaction;

// =======================
// DB CONNECTION
// =======================
export const dbConnection = async () => {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const isProduction = NODE_ENV === "production";
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  let sequelize;

  // =======================
  // PRIORITY 1: PRODUCTION (requires DATABASE_URL)
  // =======================
  if (isProduction) {
    if (!hasDatabaseUrl) {
      throw new Error(
        "❌ DATABASE_URL is required in production environment.\n" +
        "Set DATABASE_URL in your production environment variables.\n" +
        "Current NODE_ENV: production"
      );
    }

    // Detect if DATABASE_URL is local (localhost/127.0.0.1) - disable SSL for local
    const databaseUrl = process.env.DATABASE_URL;
    const isLocalDatabase = databaseUrl.includes('localhost') || 
                            databaseUrl.includes('127.0.0.1') || 
                            databaseUrl.includes('@localhost') ||
                            databaseUrl.includes('@127.0.0.1');
    
    console.log("🔗 Using DATABASE_URL for production database connection" + (isLocalDatabase ? " (local - SSL disabled)" : " (remote - SSL enabled)"));

    const sequelizeConfig = {
      dialect: "postgres",
      protocol: "postgres",
      logging: process.env.DB_LOGGING === "true" ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };

    // Only enable SSL for remote databases (not localhost)
    if (!isLocalDatabase && process.env.DB_SSL_ENABLED === 'true') {
      sequelizeConfig.dialectOptions = {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      };
    }

    sequelize = new Sequelize(databaseUrl, sequelizeConfig);
  }
  // =======================
  // PRIORITY 2: DEVELOPMENT (LOCAL DB - ignore DATABASE_URL)
  // =======================
  else {
    if (
      !process.env.DB_NAME ||
      !process.env.DB_USER ||
      !process.env.DB_PASS ||
      !process.env.DB_HOST
    ) {
      throw new Error(
        "❌ Local DB config missing. Required: DB_NAME, DB_USER, DB_PASS, DB_HOST\n" +
        "Current NODE_ENV: " + NODE_ENV + "\n" +
        "DB_NAME: " + (process.env.DB_NAME ? "set" : "not set") + "\n" +
        "DB_USER: " + (process.env.DB_USER ? "set" : "not set") + "\n" +
        "DB_PASS: " + (process.env.DB_PASS ? "set" : "not set") + "\n" +
        "DB_HOST: " + (process.env.DB_HOST ? "set" : "not set")
      );
    }

    console.log("🔗 Using local PostgreSQL connection");

    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: "postgres",
        logging: process.env.DB_LOGGING === "true" ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    );
  }

  // =======================
  // AUTHENTICATE
  // =======================
  if (!sequelize) {
    throw new Error(
      "❌ Sequelize instance not initialized. Check your database configuration."
    );
  }

  try {
    await sequelize.authenticate();
    console.log("✅ DB authenticated successfully");

    // =======================
    // INIT MODELS
    // =======================
    User = await createUserModel(sequelize);
    License = await createLicenseModel(sequelize);
    Module = await createModuleModel(sequelize);
    Banner = await createBannerModel(sequelize);
    categories = await createCategoryModel(sequelize);
    Product = await createProductModel(sequelize);
    Image = await createImageModel(sequelize);
    UnitValue = await createUnitValueModel(sequelize);
    ProductVariant = await createProductVariantModel(sequelize);
    CustomerDetail = await customerDetailModel(sequelize);
    CustomerAddressDetail = await customerAddressDetailModel(sequelize);
    ProductPayment = await createProductPaymentModel(sequelize);
    ContactUs = await ContactUsModel(sequelize);
    Review = await createReviewModel(sequelize);
    Testimonial = await createTestimonialModel(sequelize);
    Video = await createVideoModel(sequelize);
    Order = await createOrderModel(sequelize);
    OrderRecord = await createOrderRecordModel(sequelize);
    Payment = await createPaymentModel(sequelize);
    WebhookLog = await createWebhookLogModel(sequelize);
    ErrorLog = await createErrorLogModel(sequelize);
    VisitorLog = await createVisitorLogModel(sequelize);
    StockTransaction = await createStockTransactionModel(sequelize);

    // =======================
    // ASSOCIATIONS
    // =======================
    CustomerDetail.hasMany(CustomerAddressDetail, {
      foreignKey: "customerDetailId",
      as: "addresses",
    });

    CustomerAddressDetail.belongsTo(CustomerDetail, {
      foreignKey: "customerDetailId",
      as: "customer",
    });

    Order.belongsTo(CustomerDetail, {
      foreignKey: "customerId",
      as: "customer",
    });

    CustomerDetail.hasMany(Order, {
      foreignKey: "customerId",
      as: "orders",
    });

    // =======================
    // ENUM UPDATE (SAFE)
    // =======================
    try {
      const { updateOrderStatusEnum } = await import(
        "../db/migrations/update-order-status-enum.js"
      );
      await updateOrderStatusEnum(sequelize);
    } catch (err) {
      console.warn("⚠️ Order status enum update skipped:", err.message);
    }

    // =======================
    // SYNC MODELS
    // =======================
    const modelsToSync = [
      User,
      License,
      Module,
      Banner,
      categories,
      Product,
      Image,
      UnitValue,
      ProductVariant,
      CustomerDetail,
      CustomerAddressDetail,
      ProductPayment,
      ContactUs,
      Review,
      Testimonial,
      Video,
      Order,
      OrderRecord,
      Payment,
      WebhookLog,
      StockTransaction,
    ];

    for (const model of modelsToSync) {
      try {
        // ProductVariant: in production only create table if missing (no alter).
        // In development use alter so schema stays in sync with the model.
        if (model.name === 'ProductVariant') {
          await model.sync(isProduction ? {} : { alter: true });
          continue;
        }
        await model.sync({ alter: true });
      } catch (err) {
        console.warn(`⚠️ Sync skipped for ${model.name}:`, err.message);
      }
    }

    await ErrorLog.sync({ alter: true });
    await VisitorLog.sync({ alter: true });
    console.log("✅ All models synced");

    return {
      sequelize,
      models: {
        User,
        License,
        Module,
        Banner,
        categories,
        Product,
        Image,
        UnitValue,
        ProductVariant,
        CustomerDetail,
        CustomerAddressDetail,
        ProductPayment,
        ContactUs,
        Review,
        Testimonial,
        Video,
        Order,
        OrderRecord,
        Payment,
        WebhookLog,
        ErrorLog,
        VisitorLog,
        StockTransaction,
      },
    };
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    
    // Provide helpful error messages based on error type
    if (error.name === 'SequelizeHostNotFoundError' || 
        error.name === 'SequelizeConnectionError' || 
        error.name === 'SequelizeAuthenticationError') {
      
      const usingDatabaseUrl = isProduction && !!process.env.DATABASE_URL;
      
      if (usingDatabaseUrl) {
        console.error("\n💡 Using DATABASE_URL for connection");
        console.error("💡 Make sure:");
        console.error("   - DATABASE_URL is correct and accessible");
        console.error("   - Database server is running and reachable");
        console.error("   - Network/firewall allows connection");
        console.error("   - SSL/TLS settings are correct");
      } else {
        console.error("\n💡 Using local DB config: " + 
          (process.env.DB_HOST || 'localhost') + ":" + 
          (process.env.DB_PORT || 5432));
        console.error("💡 Make sure:");
        console.error("   - PostgreSQL server is running");
        console.error("   - Database credentials (DB_NAME, DB_USER, DB_PASS) are correct");
        console.error("   - Network/firewall allows connection");
        console.error("   - DB_HOST and DB_PORT are correct");
      }
    }
    
    throw error;
  }
};

// =======================
// EXPORT MODELS
// =======================
export {
  User,
  License,
  Module,
  Banner,
  categories,
  Product,
  Image,
  UnitValue,
  ProductVariant,
  CustomerDetail,
  CustomerAddressDetail,
  ProductPayment,
  ContactUs,
  Review,
  Testimonial,
  Video,
  Order,
  OrderRecord,
  Payment,
  WebhookLog,
  ErrorLog,
  VisitorLog,
  StockTransaction,
};
