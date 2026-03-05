import { DataTypes } from 'sequelize';

/**
 * StockTransaction Model
 * Tracks all stock changes for audit trail and idempotency
 */
const createStockTransactionModel = (sequelize) => {
  const Order = sequelize.models.Order;
  const ProductVariant = sequelize.models.ProductVariant;

  const StockTransaction = sequelize.define('StockTransaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Orders', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Order that triggered this stock change',
    },
    productVariantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ProductVariants', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Quantity changed (positive for restore, negative for reduce)',
    },
    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock before this transaction',
    },
    newStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock after this transaction',
    },
    transactionType: {
      type: DataTypes.ENUM('reduce', 'restore', 'reserve', 'release'),
      allowNull: false,
      comment: 'Type of stock transaction',
    },
    orderStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Order status when this transaction occurred',
    },
    isReversed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this transaction has been reversed',
    },
    reversedByTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'StockTransactions', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Transaction ID that reversed this one - RESTRICT to preserve audit trail',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata (payment ID, webhook event, etc.)',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    timestamps: true,
    createdAt: 'createdOnUTC',
    updatedAt: 'lastModifiedOnUTC',
    tableName: 'StockTransactions',
    indexes: [
      { fields: ['orderId'] },
      { fields: ['productVariantId'] },
      { fields: ['orderId', 'productVariantId', 'transactionType'] },
      { fields: ['isReversed'] },
    ],
  });

  // Associations
  StockTransaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  StockTransaction.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'variant', onDelete: 'RESTRICT' });
  StockTransaction.belongsTo(StockTransaction, { foreignKey: 'reversedByTransactionId', as: 'reversedBy', onDelete: 'RESTRICT' });

  Order.hasMany(StockTransaction, { foreignKey: 'orderId', as: 'stockTransactions' });
  ProductVariant.hasMany(StockTransaction, { foreignKey: 'productVariantId', as: 'stockTransactions', onDelete: 'RESTRICT' });

  return StockTransaction;
};

export default createStockTransactionModel;

