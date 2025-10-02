import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Assuming you have User model
import Admin from "../models/Admin.js";
import verifyAdmin from "../middlewares/VerifyAdmin.js";

const router = express.Router();

/* ------------------ ADMIN SIGNUP ------------------ */
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await Admin.findOne({ username });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();

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
    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, username: admin.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ GET ALL TICKETS ------------------ */
router.get("/tickets", verifyAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ "tickets.0": { $exists: true } }).lean();

    const allTickets = users
      .flatMap(u =>
        u.tickets.map(t => ({
          _id: t._id,
          userId: u._id,
          fullName: u.fullName,
          mobile: u.mobile,
          email: u.email,
          state: u.state,
          age: u.age,
          aadhaar: u.aadhaar,
          ...t,
        }))
      )
      .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));

    const totalTickets = allTickets.length;
    const totalPages = Math.ceil(totalTickets / limit);
    const paginatedTickets = allTickets.slice(skip, skip + limit);

    res.json({
      data: paginatedTickets,
      totalPages,
      totalTickets,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ DELETE TICKET ------------------ */
router.delete("/tickets/:ticketId", verifyAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const user = await User.findOne({ "tickets._id": ticketId });
    if (!user) return res.status(404).json({ message: "Ticket not found" });

    user.tickets = user.tickets.filter(t => t._id.toString() !== ticketId);
    await user.save();

    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
