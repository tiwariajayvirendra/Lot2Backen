import express from "express";
import mongoose from "mongoose";
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

import User from "./models/User.js";
import Admin from "./models/Admin.js";
import adminRoutes from "./routes/admin.js";
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

// ------------------ MongoDB Connection ------------------ //
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lotteryDB")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ------------------ Serve Ticket PNGs ------------------ //
const ticketsDir = path.join(__dirname, "tickets");
if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir);
app.use("/tickets", express.static(ticketsDir));

// ------------------ Razorpay Setup ------------------ //
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------ Create Default Admin ------------------ //
const createDefaultAdmin = async () => {
  try {
    const existing = await Admin.findOne({ username: "admin" });
    if (!existing) {
      const admin = new Admin({ username: "admin", password: "kannu2529" });
      await admin.save();
      console.log("Default admin created: username=admin, password=kannu2529");
    } else {
      console.log("Admin already exists");
    }
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
};
createDefaultAdmin();

// ------------------ Create Razorpay Order ------------------ //
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, ticketNumber, skimId, userData } = req.body;

    if (!amount || !ticketNumber || !userData) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `ticket_${ticketNumber}_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.status(201).json({ order });
  } catch (err) {
    console.error("Create-order error:", err);
    // Send a more specific error message to the frontend
    const errorMessage = err.error?.description || err.message || "Could not create Razorpay order.";
    res.status(err.statusCode || 500).json({ message: errorMessage });
  }
});

// ------------------ Verify Payment & Generate Ticket ------------------ //
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, ticketNumber, skimId, amount, userData } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Check if this exact ticket has already been purchased for this scheme
    const existingTicket = await User.findOne({
      "tickets.ticketNumber": ticketNumber,
      "tickets.skimId": skimId,
    });

    if (existingTicket) {
      return res.status(409).json({
        message: `Ticket number ${ticketNumber} has already been purchased for this scheme.`,
        isDuplicate: true,
      });
    }

    // Create the ticket object first, with all payment details
    const newTicket = {
      ticketNumber,
      skimId,
      amountPaid: amount,
      purchaseDate: new Date(),
      paymentStatus: "Paid",
      downloadLink: "", // Will be updated later
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    };

    // Find or create user
    let user = await User.findOne({
      $or: [
        { mobile: userData.mobile },
        ...(userData.email ? [{ email: userData.email }] : [])
      ]
    }).exec();

    if (user) {
      // User exists, add the new ticket
      user.tickets.push(newTicket);
    } else {
      // No user found, create a new one
      user = new User({ ...userData, tickets: [newTicket] });
    }
    await user.save();

    const ticket = user.tickets[user.tickets.length - 1];

    // Generate QR code
    const qrPath = path.join(ticketsDir, `qr_${ticket._id}.png`);
    await QRCode.toFile(qrPath, `https://pay.example.com/${ticket._id}`);

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
    ctx.fillText(ticketNumber, canvas.width / 2, 125);

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

    const ticketPath = path.join(ticketsDir, `ticket_${ticket._id}.png`);
    const out = fs.createWriteStream(ticketPath);
    const pngStream = canvas.createPNGStream();
    await pipeline(pngStream, out);

    ticket.downloadLink = `/tickets/ticket_${ticket._id}.png`;
    // This save is crucial to ensure the download link is in the user object sent back to the client
    await user.save();

    res.status(201).json({
      message: "Ticket purchased successfully",
      downloadLink: ticket.downloadLink,
      userData: user,
    });

  } catch (err) {
    console.error("Verify-payment error:", err);
    if (err.code === 11000) { // Handle duplicate key error specifically
      const field = Object.keys(err.keyPattern)[0];
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

    const user = await User.findOne({ mobile }).select("-tickets.razorpaySignature"); // Exclude signature for privacy
    if (!user || user.tickets.length === 0) {
      return res.status(404).json({ message: "No tickets found for this mobile number." });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user tickets:", err);
    res.status(500).json({ message: "Server error while fetching tickets." });
  }
});

// ------------------ Export All Tickets as CSV (Admin) ------------------ //
app.get("/api/admin/tickets/export", async (req, res) => {
  // Note: In a production app, this route should be protected by the same
  // admin authentication middleware as your other admin routes.
  try {
    const users = await User.find({ "tickets.0": { $exists: true } }).lean();

    const allTickets = users.flatMap(user =>
      user.tickets.map(ticket => ({
        ticketId: ticket._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        state: user.state,
        age: user.age,
        aadhaar: user.aadhaar,
        ticketNumber: ticket.ticketNumber,
        skimId: ticket.skimId,
        amountPaid: ticket.amountPaid,
        purchaseDate: new Date(ticket.purchaseDate).toLocaleString("en-IN"),
        razorpayOrderId: ticket.razorpayOrderId,
        razorpayPaymentId: ticket.razorpayPaymentId,
      }))
    );

    if (allTickets.length === 0) {
      return res.status(404).json({ message: "No tickets to export." });
    }

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(allTickets);

    res.header("Content-Type", "text/csv");
    res.attachment("tickets-export.csv");
    res.send(csv);

  } catch (err) {
    console.error("Error exporting tickets:", err);
    res.status(500).json({ message: "Server error during CSV export." });
  }
});

// ------------------ Start Server ------------------ //
app.listen(PORT ,() => console.log(`Server running on port: ${PORT}`));
