import { DataTypes } from 'sequelize';

const createProductVariantModel = (sequelize) => {
  const Product = sequelize.models.Product;
  const UnitValue = sequelize.models.UnitValue;

  const ProductVariant = sequelize.define('ProductVariant', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    unitValueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'UnitValues',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    weight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: {
        min: 0.001,
      },
      comment: 'Quantity value (e.g., 500, 1, 250)',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    comparePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Original/MRP price for showing discount',
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    gtin: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Global Trade Item Number',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    minOrderQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    maxOrderQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum quantity that can be ordered',
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
      comment: 'Discount percentage',
    },
    wholesalePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Wholesale price for bulk orders',
    },
    wholesaleMinQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Minimum quantity for wholesale pricing',
    },
    razorpayItemId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Razorpay item ID for this variant',
    },
    isDefaultVariant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      { fields: ['productId'] },
      { fields: ['sku'], unique: true },
      { fields: ['unitValueId'] },
      { fields: ['isDefaultVariant'] },
      { fields: ['isActive'] },
      // Note: barcode uniqueness handled at application level to allow nulls
      // { fields: ['barcode'], unique: true },
    ],
  });

  // Associations
  ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product', onDelete: 'RESTRICT' });
  ProductVariant.belongsTo(UnitValue, { foreignKey: 'unitValueId', as: 'unitValue', onDelete: 'RESTRICT' });

  Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants', onDelete: 'RESTRICT' });
  UnitValue.hasMany(ProductVariant, { foreignKey: 'unitValueId', as: 'variants', onDelete: 'RESTRICT' });

  return ProductVariant;
};

export default createProductVariantModel;

