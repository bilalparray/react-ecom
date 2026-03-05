import { DataTypes } from "sequelize";

const createOrderModel = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      razorpayOrderId: { type: DataTypes.STRING,unique: true, allowNull: true },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // unique: true,
        references: { model: "CustomerDetails", key: "id" },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paid_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      due_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "INR" },
      status: {
        type: DataTypes.ENUM("created", "paid", "failed", "flagged", "refunded", "partially_refunded", "shipped", "delivered", "cancelled"),
        defaultValue: "created",
      },
      paymentId: { type: DataTypes.STRING, allowNull: true },
      signature: { type: DataTypes.STRING, allowNull: true },
      receipt: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.INTEGER, allowNull: true },
      lastModifiedBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      timestamps: true,
      createdAt: "createdOnUTC",
      updatedAt: "lastModifiedOnUTC",
      tableName: "Orders",
    }
  );
  return Order;
};

export default createOrderModel;
