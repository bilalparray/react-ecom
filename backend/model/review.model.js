import { DataTypes } from "sequelize";

const createReviewModel = (sequelize) => {
  const Product = sequelize.models.Product;

  const Review = sequelize.define(
    "Review",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
        isApproved: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Products", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lastModifiedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
    }
  );

  // Associations
  Review.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
    onDelete: "RESTRICT",
  });
  Product.hasMany(Review, {
    foreignKey: "productId",
    as: "reviews",
    onDelete: "RESTRICT",
  });

  return Review;
};

export default createReviewModel;
