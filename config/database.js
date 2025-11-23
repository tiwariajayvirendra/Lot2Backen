import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Handle empty password - if DB_PASSWORD is empty string, use undefined
const dbPassword = process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '' 
  ? process.env.DB_PASSWORD 
  : undefined;

const sequelize = new Sequelize(
  process.env.DB_NAME || 'lottery_db',
  process.env.DB_USER || 'root',
  dbPassword, // undefined if not set (for no password MySQL)
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      // MySQL 8.0 compatibility settings
      connectTimeout: 60000,
      // Support for MySQL 8.0 authentication
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // MySQL 8.0 specific settings
    timezone: '+05:30', // IST timezone
  }
);

export default sequelize;

