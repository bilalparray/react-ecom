import { BOOLEAN, DataTypes } from 'sequelize';

const createProductModel = (sequelize) => {
  const Category = sequelize.models.Category;

  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    richDescription: { type: DataTypes.TEXT, allowNull: true },
    itemId: { type: DataTypes.STRING, allowNull: true }, // our SKU/ID
    // ⚠️ REMOVED: price, stock, sku moved to ProductVariant
    // ⚠️ REMOVED: razorpayItemId moved to ProductVariant (each variant has its own Razorpay item)
    // weight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: true, defaultValue: "INR" },
    isBestSelling: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Soft delete flag - set to false instead of deleting products with historical orders',
    },
    // 🔹 Razorpay-specific (product-level, variants have their own)
    hsnCode: { type: DataTypes.STRING, allowNull: true },
    taxRate: { type: DataTypes.INTEGER, allowNull: true },
    // Note: unit moved to ProductVariant level

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Categories', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    timestamps: true,
    createdAt: 'createdOnUTC',
    updatedAt: 'lastModifiedOnUTC',
    indexes: [
      { fields: ['categoryId'] }, 
      { fields: ['isBestSelling'] },
      { fields: ['isActive'] },
    ],
  });

  // Associations
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category', onDelete: 'RESTRICT' });
  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products', onDelete: 'RESTRICT' });

  return Product;
};

export default createProductModel;
