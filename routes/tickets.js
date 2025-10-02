import express from "express";
import User from "../models/User.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ticketsDir = path.join(__dirname, "../tickets");

if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir);

// POST /purchase-ticket (after payment)
router.post("/purchase-ticket", async (req, res) => {
  try {
    const { fullName, mobile, state, age, aadhaar, ticketNumber, skimId, amountPaid } = req.body;

    // Validation
    if (!fullName || !mobile || !state || !age || !ticketNumber || !amountPaid) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    if (age <= 18) return res.status(400).json({ message: "Age must be greater than 18" });
    if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ message: "Invalid mobile number" });
    if (aadhaar && !/^\d{12}$/.test(aadhaar)) return res.status(400).json({ message: "Invalid Aadhaar" });

    // Check if ticketNumber is already purchased
    const existingTicket = await User.findOne({ "tickets.ticketNumber": ticketNumber });
    if (existingTicket) return res.status(400).json({ message: "Ticket already sold" });

    // Generate QR Code
    const qrValue = `TICKET-${ticketNumber}-AMOUNT-${amountPaid}`;
    const qrFileName = `Ticket_${ticketNumber}.png`;
    const qrPath = path.join(ticketsDir, qrFileName);
    await QRCode.toFile(qrPath, qrValue, { width: 300 });

    // Save ticket to DB
    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({
        fullName,
        mobile,
        state,
        age,
        aadhaar,
        tickets: [{ ticketNumber, skimId, amountPaid, purchaseDate: new Date(), downloadLink: `/tickets/${qrFileName}` }],
      });
    } else {
      user.tickets.push({ ticketNumber, skimId, amountPaid, purchaseDate: new Date(), downloadLink: `/tickets/${qrFileName}` });
      await user.save();
    }

    res.status(201).json({
      message: "Ticket purchased successfully",
      downloadLink: `/tickets/${qrFileName}`,
      userData: user,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /purchased-tickets
router.get("/purchased-tickets/:skimId", async (req, res) => {
  try {
    const { skimId } = req.params;
    if (!skimId) {
      return res.status(400).json({ message: "Skim ID is required" });
    }

    // Find users who have tickets for the specific skimId
    const users = await User.find({ "tickets.skimId": skimId }).select("tickets.ticketNumber tickets.skimId").lean();
    const purchasedTickets = users.flatMap(user => 
      user.tickets.filter(ticket => ticket.skimId === skimId).map(ticket => Number(ticket.ticketNumber)));
    res.json({ purchasedTickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
