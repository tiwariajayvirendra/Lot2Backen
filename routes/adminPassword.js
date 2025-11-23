// setAdminPassword.js - MySQL Version
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { sequelize, Admin } from "../models/index.js";

dotenv.config();

const run = async () => {
  try {
    // MySQL connection using Sequelize
    await sequelize.authenticate();
    console.log("MySQL connected successfully for admin password update");

    const username = process.env.ADMIN_USERNAME || process.env.DB_ADMIN_USERNAME;
    const newPlain = process.env.ADMIN_PASSWORD || process.env.DB_ADMIN_PASSWORD;

    // वैरिएबल की जाँच करें
    if (!username || !newPlain) {
      console.error("Error: ADMIN_USERNAME and ADMIN_PASSWORD must be set in your .env file.");
      console.error("Example: ADMIN_USERNAME=admin, ADMIN_PASSWORD=your_password");
      process.exit(1);
    }

    // Find admin by username
    const admin = await Admin.findOne({ 
      where: { username: username.toLowerCase() } 
    });

    if (admin) {
      // Update password (hash will be done by the beforeSave hook)
      admin.password = newPlain;
      await admin.save();
      console.log("✅ Updated admin password for", username);
    } else {
      console.log("Admin not found. Creating new admin...");
      // Admin.create will trigger 'save' hook which automatically hashes the password
      const created = await Admin.create({ 
        username: username.toLowerCase(), 
        password: newPlain 
      });
      console.log("✅ Created admin:", created.username);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
