import sequelize from '../config/database.js';
import User from './User.js';
import Ticket from './Ticket.js';
import Admin from './Admin.js';
import Winner from './Winner.js';

// Define associations
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Winner, { foreignKey: 'userId', as: 'winners' });
Winner.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { sequelize, User, Ticket, Admin, Winner };

