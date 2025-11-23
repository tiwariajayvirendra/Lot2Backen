import express from "express";
import { Op } from "sequelize";
import { sequelize, User, Ticket } from "../models/index.js";

const router = express.Router();

// 🔹 Skim configuration
const skimConfig = {
  "1": { price: 50, totalTickets: 10000, prefix: "AB", suffix: "A" },
  "2": { price: 100, totalTickets: 10000, prefix: "CD", suffix: "B" },
  "3": { price: 200, totalTickets: 10000, prefix: "EF", suffix: "C" },
  "4": { price: 500, totalTickets: 10000, prefix: "GH", suffix: "D" },
};

// GET /purchased-tickets
router.get("/purchased-tickets/:skimId", async (req, res) => {
  try {
    const { skimId } = req.params;
    if (!skimId) {
      return res.status(400).json({ message: "Skim ID is required" });
    }

    const tickets = await Ticket.findAll({
      where: { skimId },
      attributes: ['ticketNumber']
    });

    const purchasedTickets = tickets.map(ticket => ticket.ticketNumber);

    res.json({ purchasedTickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /skim-status/:skimId - Provides detailed status for a skim
router.get("/skim-status/:skimId", async (req, res) => {
  try {
    const { skimId } = req.params;
    const config = skimConfig[skimId];

    if (!config) {
      return res.status(404).json({ message: "Skim ID not found" });
    }

    // Check database connection
    try {
      await sequelize.authenticate();
    } catch (dbErr) {
      console.error("Database connection error in skim-status:", dbErr);
      return res.status(503).json({ 
        message: "Database connection failed",
        error: "Please check your MySQL connection"
      });
    }

    const soldTickets = await Ticket.findAll({
      where: { skimId },
      attributes: ['ticketNumber']
    });

    // Extract numeric part from formatted ticket numbers (e.g., "AB00001A" -> 1)
    const extractNumericPart = (formatted) => {
      if (!formatted) return null;
      const match = formatted.toString().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };

    const soldTicketsFormatted = soldTickets.map(t => t.ticketNumber?.toUpperCase() || '').filter(Boolean);
    const soldTicketsSet = new Set(soldTicketsFormatted);
    
    // Also extract numeric parts for frontend compatibility
    const soldTicketsArray = soldTickets
      .map(t => extractNumericPart(t.ticketNumber))
      .filter(n => n !== null && !isNaN(n));

    const allPossibleTickets = Array.from({ length: config.totalTickets }, (_, i) => {
      const ticketNum = (i + 1).toString().padStart(5, '0'); // Start from 00001, not 00000
      return `${config.prefix}${ticketNum}${config.suffix}`.toUpperCase();
    });

    const ticketsWithStatus = allPossibleTickets.map(ticketNumber => ({
      number: ticketNumber,
      isSold: soldTicketsSet.has(ticketNumber)
    }));

    const soldCount = soldTicketsArray.length;
    const remainingCount = config.totalTickets - soldCount;

    res.json({
      tickets: ticketsWithStatus,
      soldTickets: soldTicketsArray,
      soldCount,
      remainingCount,
      totalTickets: config.totalTickets
    });

  } catch (err) {
    console.error("Error in skim-status:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      message: "Server error",
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
});

// POST /initiate-purchase - Verify ticket availability before payment
router.post("/initiate-purchase", async (req, res) => {
  try {
    const { skimId, ticketNumber } = req.body;

    if (!skimId || !ticketNumber) {
      return res.status(400).json({ message: "Skim ID and Ticket Number are required." });
    }

    // Format ticket number for comparison
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
    
    const formattedTicketNumber = formatTicketNumber(skimId, ticketNumber);
    
    const existingTicket = await Ticket.findOne({
      where: {
        skimId: skimId,
        ticketNumber: formattedTicketNumber
      }
    });

    if (existingTicket) {
      return res.status(409).json({ message: "This ticket has already been purchased. Please select another." });
    }

    res.status(200).json({ message: "Ticket is available. You can proceed to payment." });

  } catch (err) {
    console.error("Error during purchase initiation:", err);
    res.status(500).json({ message: "Server error during ticket verification." });
  }
});

export default router;
