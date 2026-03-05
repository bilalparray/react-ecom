import { DataTypes } from 'sequelize';

const createPaymentModel = (sequelize) => {
  const Order = sequelize.models.Order;
  const CustomerDetail = sequelize.models.CustomerDetail;

  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    razorpayPaymentId: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique: true,
      comment: 'Razorpay payment ID (idempotency key)',
    },
    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'razorpayOrderId',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'CustomerDetails',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount in currency units (not paise)',
    },
    amountPaise: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in paise (Razorpay format)',
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.ENUM('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'),
      allowNull: false,
      defaultValue: 'created',
    },
    method: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Payment method (card, upi, netbanking, etc.)',
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payment signature for verification',
    },
    isAmountValid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Flag if amount matches order amount',
    },
    isProcessed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Idempotency flag - prevents duplicate processing',
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional payment metadata from Razorpay',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    timestamps: true,
    createdAt: 'createdOnUTC',
    updatedAt: 'lastModifiedOnUTC',
    indexes: [
      { fields: ['razorpayPaymentId'], unique: true },
      { fields: ['razorpayOrderId'] },
      { fields: ['orderId'] },
      { fields: ['customerId'] },
      { fields: ['status'] },
      { fields: ['isProcessed'] },
    ],
  });

  // Associations
  Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order', onDelete: 'CASCADE' });
  Payment.belongsTo(CustomerDetail, { foreignKey: 'customerId', as: 'customer', onDelete: 'RESTRICT' });
  
  Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
  CustomerDetail.hasMany(Payment, { foreignKey: 'customerId', as: 'orderPayments', onDelete: 'RESTRICT' });

  return Payment;
};

export default createPaymentModel;

