// setAdminPassword.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lotteryDB");
    const username = "admin";                 // change if different
    const newPlain = "NEW_PASSWORD_HERE";     // replace with your new password
    const hashed = await bcrypt.hash(newPlain, 10);

    const admin = await Admin.findOneAndUpdate(
      { username },
      { password: hashed },
      { new: true }
    );

    if (admin) {
      console.log("Updated admin password for", username);
    } else {
      console.log("Admin not found. Creating new admin...");
      const created = await Admin.create({ username, password: hashed });
      console.log("Created admin:", created.username);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
 