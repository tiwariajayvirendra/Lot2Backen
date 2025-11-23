import express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import Razorpay from "razorpay";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { Parser } from "json2csv";
import { Op } from "sequelize";

import { sequelize, User, Ticket, Admin } from "./models/index.js";
import adminRoutes from "./routes/admin.js";
import verifyAdmin from "./middlewares/VerifyAdmin.js";
import winnerRoutes from "./routes/winners.js";
import ticketRoutes from "./routes/tickets.js";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

//PORT 
const PORT = process.env.PORT || 5000;

// ------------------ Middleware ------------------ //
app.use(cors());
app.use(express.json());
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/winners", winnerRoutes);

// ------------------ MySQL Connection & Server Start ------------------ //
// This function will be called at the end after all routes are registered
async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ MySQL connected successfully");
    
    // Sync database (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log("✅ Database synchronized - All tables ready");
    
    // Start server only after database is ready
    app.listen(PORT, () => {
      console.log(`✅ Server running on port: ${PORT}`);
      console.log(`✅ All systems ready!`);
    });
  } catch (err) {
    console.error("❌ MySQL connection error:", err);
    console.error("❌ Server startup failed. Please check your database configuration.");
    process.exit(1);
  }
}

// ------------------ Serve Ticket PNGs ------------------ //
const ticketsDir = path.join(__dirname, "tickets");
if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir);
app.use("/tickets", express.static(ticketsDir));

// ------------------ Razorpay Setup ------------------ //
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("✅ Razorpay initialized successfully");
  } else {
    console.warn("⚠️ Razorpay credentials not configured. Payment features will not work.");
  }
} catch (err) {
  console.error("❌ Razorpay initialization error:", err);
}

// ------------------ Helper: Format Ticket Number ------------------ //
const formatTicketNumber = (skimId, num) => {
  const numStr = num.toString().padStart(5, '0');
  switch (skimId) {
    case "1": return `AB${numStr}A`;
    case "2": return `CD${numStr}B`;
    case "3": return `EF${numStr}C`;
    case "4": return `GH${numStr}D`;
    default: return `${skimId}-${numStr}`;
  }
};

// ------------------ Create Razorpay Order ------------------ //
app.post("/api/create-order", async (req, res) => {
  try {
    // Check Razorpay configuration
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials not configured");
      return res.status(500).json({ 
        message: "Payment gateway not configured",
        hint: "Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file"
      });
    }

    if (!razorpay) {
      console.error("Razorpay instance not initialized");
      return res.status(500).json({ 
        message: "Payment gateway initialization failed",
        hint: "Please check Razorpay credentials in .env file"
      });
    }

    const { amount, ticketNumber, skimId, userData } = req.body;

    if (!amount || !ticketNumber || !userData) {
      return res.status(400).json({ 
        message: "Required fields missing",
        hint: "Please provide amount, ticketNumber, and userData"
      });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        message: "Invalid amount",
        hint: "Amount must be a positive number"
      });
    }

    const options = {
      amount: Math.round(amount * 100), // in paise, ensure it's an integer
      currency: "INR",
      receipt: `ticket_${ticketNumber}_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.status(201).json({ order });
  } catch (err) {
    console.error("Create-order error:", err);
    const errorMessage = err.error?.description || err.message || "Could not create Razorpay order.";
    res.status(err.statusCode || 500).json({ 
      message: errorMessage,
      hint: "Please check Razorpay configuration and try again",
      ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
  }
});

// ------------------ Verify Payment & Generate Ticket ------------------ //
app.post("/api/verify-payment", async (req, res) => {
  try {
    // Check Razorpay configuration
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay key secret not configured");
      return res.status(500).json({ 
        message: "Payment gateway not configured",
        hint: "Please set RAZORPAY_KEY_SECRET in .env file"
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ticketNumber, skimId, amount, userData } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        message: "Missing payment verification data",
        hint: "Please provide razorpay_order_id, razorpay_payment_id, and razorpay_signature"
      });
    }

    if (!ticketNumber || !skimId || !amount || !userData) {
      return res.status(400).json({ 
        message: "Missing ticket information",
        hint: "Please provide ticketNumber, skimId, amount, and userData"
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Payment signature verification failed");
      return res.status(400).json({ 
        message: "Payment verification failed",
        hint: "Invalid payment signature. Payment may be fraudulent."
      });
    }

    // Format ticket number
    const formattedTicketNumber = formatTicketNumber(skimId, ticketNumber);

    // Check if this exact ticket has already been purchased for this scheme
    const existingTicket = await Ticket.findOne({
      where: {
        ticketNumber: formattedTicketNumber,
        skimId: skimId,
      }
    });

    if (existingTicket) {
      return res.status(409).json({
        message: `Ticket number ${ticketNumber} has already been purchased for this scheme.`,
        isDuplicate: true,
      });
    }

    // Find or create user
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { mobile: userData.mobile },
          ...(userData.email ? [{ email: userData.email }] : [])
        ]
      }
    });

    if (!user) {
      // Create new user
      user = await User.create({
        fullName: userData.fullName,
        mobile: userData.mobile,
        state: userData.state,
        age: userData.age,
        aadhaar: userData.aadhaar || null,
        email: userData.email || null,
        password: null
      });
    }

    // Create ticket with formatted ticket number
    const ticket = await Ticket.create({
      ticketNumber: formattedTicketNumber,
      skimId,
      amountPaid: amount,
      purchaseDate: new Date(),
      paymentStatus: "Paid",
      downloadLink: "",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      userId: user.id
    });

    // Generate QR code
    const qrPath = path.join(ticketsDir, `qr_${ticket.id}.png`);
    await QRCode.toFile(qrPath, `https://pay.example.com/${ticket.id}`);

    // Create ticket PNG
    const canvas = createCanvas(700, 400);
    const ctx = canvas.getContext("2d");

    // --- Attractive UI Design ---
    // Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#434343');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px 'Helvetica Neue', Arial";
    ctx.textAlign = "center";
    ctx.fillText("LOTTERY TICKET", canvas.width / 2, 60);

    // Ticket Number
    ctx.fillStyle = "#FFD700"; // Gold color
    ctx.font = "bold 48px 'Courier New', monospace";
    ctx.fillText(formattedTicketNumber, canvas.width / 2, 125);

    // User Details
    ctx.fillStyle = "#E0E0E0";
    ctx.font = "20px 'Helvetica Neue', Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Name: ${userData.fullName}`, 40, 180);
    ctx.fillText(`Mobile: ${userData.mobile}`, 40, 210);
    ctx.fillText(`State: ${userData.state}`, 40, 240);

    const img = await loadImage(qrPath);
    ctx.drawImage(img, 520, 150, 150, 150);

    // --- Footer with 2 columns ---
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 280);
    ctx.lineTo(canvas.width - 40, 280);
    ctx.stroke();

    ctx.fillStyle = "#BDBDBD";
    ctx.font = "14px 'Helvetica Neue', Arial";
    const col1X = 40;
    const col2X = 370;

    // Row 1
    ctx.fillText(`Amount Paid: ₹${amount}`, col1X, 310);
    ctx.fillText(`Skim ID: ${skimId}`, col2X, 310);
    // Row 2
    ctx.fillText(`Payment ID: ${razorpay_payment_id}`, col1X, 340);
    const purchaseTime = ticket.purchaseDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(`Purchase Time: ${purchaseTime}`, col2X, 340);
    // Row 3
    ctx.fillText(`Purchase Date: ${ticket.purchaseDate.toLocaleDateString('en-IN')}`, col1X, 370);

    const ticketPath = path.join(ticketsDir, `ticket_${ticket.id}.png`);
    const out = fs.createWriteStream(ticketPath);
    const pngStream = canvas.createPNGStream();
    await pipeline(pngStream, out);

    ticket.downloadLink = `/tickets/ticket_${ticket.id}.png`;
    await ticket.save();

    // Get user with tickets for response
    const userWithTickets = await User.findByPk(user.id, {
      include: [{
        model: Ticket,
        as: 'tickets',
        attributes: { exclude: ['razorpaySignature'] }
      }]
    });

    res.status(201).json({
      message: "Ticket purchased successfully",
      downloadLink: ticket.downloadLink,
      userData: userWithTickets,
    });

  } catch (err) {
    console.error("Verify-payment error:", err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors[0]?.path || 'field';
      return res.status(409).json({ message: `A user with this ${field} already exists.` });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// ------------------ Find User Tickets by Mobile ------------------ //
app.get("/api/user-tickets/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: "A valid 10-digit mobile number is required." });
    }

    const user = await User.findOne({
      where: { mobile },
      include: [{
        model: Ticket,
        as: 'tickets',
        attributes: { exclude: ['razorpaySignature'] }
      }]
    });

    if (!user || !user.tickets || user.tickets.length === 0) {
      return res.status(404).json({ message: "No tickets found for this mobile number." });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user tickets:", err);
    res.status(500).json({ message: "Server error while fetching tickets." });
  }
});

// ------------------ Export Tickets as CSV (Admin, Skim-Specific) ------------------ //
app.get("/api/admin/tickets/export", verifyAdmin, async (req, res) => {
  try {
    const { skimId } = req.query;

    const whereClause = {};
    if (skimId && skimId !== "all") {
      whereClause.skimId = skimId;
    }

    const tickets = await Ticket.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'mobile', 'state', 'aadhaar']
      }],
      order: [['purchaseDate', 'DESC']],
      attributes: ['ticketNumber', 'skimId', 'amountPaid', 'purchaseDate', 'razorpayPaymentId']
    });

    if (tickets.length === 0) {
      return res.status(404).json({ message: "No tickets to export." });
    }

    const ticketsToExport = tickets.map(ticket => ({
      fullName: ticket.user?.fullName || '',
      mobile: ticket.user?.mobile || '',
      state: ticket.user?.state || '',
      aadhaar: ticket.user?.aadhaar || '',
      ticketNumber: ticket.ticketNumber,
      skimId: ticket.skimId,
      amountPaid: ticket.amountPaid,
      purchaseDate: ticket.purchaseDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      razorpayPaymentId: ticket.razorpayPaymentId
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(ticketsToExport);

    const fileName = `tickets-export-skim-${skimId || 'all'}.csv`;
    res.header("Content-Type", "text/csv; charset=utf-8");
    res.attachment(fileName);
    res.send(csv);

  } catch (err) {
    console.error("Error exporting tickets:", err);
    res.status(500).json({ message: "Server error during CSV export." });
  }
});

// ------------------ Start Server ------------------ //
// Start server after all routes are registered and database is ready
startServer();
