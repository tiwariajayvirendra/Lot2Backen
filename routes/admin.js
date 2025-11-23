import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { sequelize, Admin, User, Ticket } from "../models/index.js";
import verifyAdmin from "../middlewares/VerifyAdmin.js";

const router = express.Router();

/* ------------------ ADMIN SIGNUP ------------------ */
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await Admin.findOne({ where: { username: username.toLowerCase() } });
    if (existing)
      return res.status(400).json({ message: "Admin already exists" });

    const admin = await Admin.create({ username: username.toLowerCase(), password });
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ ADMIN LOGIN ------------------ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        message: "All fields required",
        hint: "Please provide both username and password"
      });
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ 
        message: "Server configuration error: JWT_SECRET missing",
        hint: "Please set JWT_SECRET in your .env file"
      });
    }

    // Check database connection
    try {
      await sequelize.authenticate();
    } catch (dbErr) {
      console.error("Database connection error in login:", dbErr);
      return res.status(503).json({ 
        message: "Database connection failed",
        hint: "Please check your MySQL connection and ensure the database is running"
      });
    }

    // Find admin by username (case-insensitive)
    const admin = await Admin.findOne({ 
      where: { username: username.toLowerCase().trim() } 
    });
    
    if (!admin) {
      console.log(`Login attempt failed: Admin '${username}' not found`);
      // Check if any admin exists (for debugging)
      const adminCount = await Admin.count();
      if (adminCount === 0) {
        return res.status(401).json({ 
          message: "Invalid credentials",
          hint: "No admin account exists. Please create an admin account first using /api/admin/signup or adminPassword.js script"
        });
      }
      return res.status(401).json({ 
        message: "Invalid credentials",
        hint: "Username or password is incorrect"
      });
    }

    // Check if admin has a password (should be hashed)
    if (!admin.password) {
      console.error("Admin found but password is missing");
      return res.status(500).json({ 
        message: "Admin account error",
        hint: "Admin account exists but password is not set. Please reset the password."
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log(`Login attempt failed: Incorrect password for admin '${username}'`);
      return res.status(401).json({ 
        message: "Invalid credentials",
        hint: "Username or password is incorrect"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`✅ Admin '${admin.username}' logged in successfully`);
    res.json({ 
      token, 
      username: admin.username,
      message: "Login successful"
    });
  } catch (err) {
    console.error("Admin login error:", err);
    console.error("Error stack:", err.stack);
    // Send more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Server error: ${err.message}` 
      : "Server error";
    res.status(500).json({ 
      message: errorMessage,
      hint: "An unexpected error occurred. Please try again later.",
      ...(process.env.NODE_ENV === 'development' && { 
        error: err.message,
        stack: err.stack 
      })
    });
  }
});

/* ------------------ GET ALL TICKETS (CORRECTED & ENHANCED) ------------------ */
router.get("/tickets", verifyAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const skimId = req.query.skimId;
    const sortBy = req.query.sortBy || "purchaseDate";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    const whereClause = {};
    if (skimId && skimId !== "all") {
      whereClause.skimId = skimId;
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'mobile', 'state', 'aadhaar']
      }],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      attributes: ['id', 'ticketNumber', 'skimId', 'amountPaid', 'purchaseDate', 'razorpayPaymentId']
    });

    const totalPages = Math.ceil(count / limit);

    const formattedTickets = tickets.map(ticket => ({
      _id: ticket.id,
      fullName: ticket.user?.fullName || '',
      mobile: ticket.user?.mobile || '',
      state: ticket.user?.state || '',
      aadhaar: ticket.user?.aadhaar || '',
      ticketNumber: ticket.ticketNumber,
      skimId: ticket.skimId,
      amountPaid: ticket.amountPaid,
      purchaseDate: ticket.purchaseDate,
      razorpayPaymentId: ticket.razorpayPaymentId,
    }));

    res.json({
      success: true,
      data: formattedTickets,
      totalPages,
      currentPage: page,
      totalTickets: count
    });
  } catch (err) {
    console.error("Error fetching admin tickets:", err);
    res.status(500).json({ message: "Server error fetching tickets" });
  }
});

/* ------------------ GET SKIM STATS (FOR ADMIN DASHBOARD) ------------------ */
router.get("/skims/stats", verifyAdmin, async (req, res) => {
  try {
    const skimConfig = {
      "1": { price: 50, totalTickets: 10000 },
      "2": { price: 100, totalTickets: 10000 },
      "3": { price: 200, totalTickets: 10000 },
      "4": { price: 500, totalTickets: 10000 },
    };

    const stats = Object.keys(skimConfig).map(skimId => ({
      skimId,
      price: skimConfig[skimId].price,
      totalTickets: skimConfig[skimId].totalTickets,
    }));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("Error fetching skim stats:", err);
    res.status(500).json({ message: "Server error while fetching skim stats." });
  }
});

/* ------------------ GET PURCHASED TICKET COUNTS PER SKIM ------------------ */
router.get("/tickets/counts", verifyAdmin, async (req, res) => {
  try {
    const summary = await Ticket.findAll({
      attributes: [
        'skimId',
        [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']
      ],
      group: ['skimId'],
      order: [['skimId', 'ASC']],
      raw: true
    });

    const countsMap = summary.reduce((acc, item) => {
      acc[item.skimId] = parseInt(item.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: countsMap,
    });
  } catch (err) {
    console.error("Error fetching sold summary:", err);
    res.status(500).json({ message: "Server error while fetching summary." });
  }
});

export default router;
