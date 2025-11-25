// Script to check for an admin account and create one if it doesn't exist.
import dotenv from "dotenv";
import { sequelize, Admin } from "./models/index.js";

dotenv.config();

const checkAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected successfully");

    const admins = await Admin.findAll({
      attributes: ['id', 'username', 'createdAt']
    });

    if (admins.length === 0) {
      console.warn("❌ No admin account found!");

      const username = process.env.DB_ADMIN_USERNAME;
      const password = process.env.DB_ADMIN_PASSWORD;

      if (!username || !password) {
        console.error("FATAL: ADMIN_USERNAME and ADMIN_PASSWORD are not set in your environment variables.");
        console.error("Please set them in your hosting provider's dashboard to create the initial admin user.");
        await sequelize.close();
        process.exit(1);
      }

      console.log(`\n💡 Creating initial admin user with username: '${username}'...`);
      
      await Admin.create({ 
        username: username.toLowerCase(), 
        password: password // The model will hash it automatically
      });

      console.log("✅ Admin account created successfully!");
      console.log("You should now be able to log in with the credentials from your environment variables.");

    } else {
      console.log(`\n✅ Found ${admins.length} admin account(s):`);
      admins.forEach((admin, index) => {
        console.log(`   ${index + 1}. Username: ${admin.username} (ID: ${admin.id})`);
        console.log(`      Created: ${admin.createdAt}`);
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

checkAdmin();
