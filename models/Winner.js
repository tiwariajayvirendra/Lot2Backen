import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Winner = sequelize.define('Winner', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  skimId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['1', '2', '3', '4']]
    }
  },
  ticketNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prize: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'winners',
  timestamps: true
});

export default Winner;
