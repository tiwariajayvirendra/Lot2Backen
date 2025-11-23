// Quick script to check if admin account exists
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
      console.log("❌ No admin account found!");
      console.log("\n💡 To create an admin account:");
      console.log("   1. Use API: POST http://localhost:5000/api/admin/signup");
      console.log("   2. Or run: node routes/adminPassword.js");
      console.log("\n   Make sure to set ADMIN_USERNAME and ADMIN_PASSWORD in .env file");
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

