import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  skimId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  purchaseDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  downloadLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pending', 'Paid'),
    defaultValue: 'Pending'
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  razorpaySignature: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['skimId', 'ticketNumber']
    }
  ]
});

export default Ticket;

