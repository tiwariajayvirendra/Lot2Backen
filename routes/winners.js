import express from "express";
import { Op } from "sequelize";
import { Winner, User, Ticket } from "../models/index.js";
import verifyAdmin from "../middlewares/VerifyAdmin.js";

const router = express.Router();

/* ------------------ GET ALL WINNERS (Public) ------------------ */
router.get("/", async (req, res) => {
  try {
    const winners = await Winner.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'state']
      }],
      order: [['skimId', 'ASC'], ['prize', 'ASC']]
    });

    res.json(winners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ ADD A WINNER (Admin) ------------------ */
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { skimId, ticketNumber, prize } = req.body;
    if (!skimId || !ticketNumber || !prize) {
      return res.status(400).json({ message: "Skim ID, Ticket Number, and Prize are required" });
    }

    const ticket = await Ticket.findOne({
      where: {
        skimId: skimId,
        ticketNumber: { [Op.like]: ticketNumber.toUpperCase() }
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or not sold" });
    }

    const existingWinner = await Winner.findOne({
      where: {
        skimId,
        ticketNumber: ticketNumber.toUpperCase()
      }
    });

    if (existingWinner) {
      return res.status(409).json({ message: "This ticket has already been declared a winner" });
    }

    const newWinner = await Winner.create({
      skimId,
      ticketNumber: ticketNumber.toUpperCase(),
      prize,
      userId: ticket.userId
    });

    const winnerWithUser = await Winner.findByPk(newWinner.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'state']
      }]
    });

    res.status(201).json(winnerWithUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ DELETE A WINNER (Admin) ------------------ */
router.delete("/:winnerId", verifyAdmin, async (req, res) => {
  try {
    const { winnerId } = req.params;
    const winner = await Winner.findByPk(winnerId);

    if (!winner) {
      return res.status(404).json({ message: "Winner not found" });
    }

    await winner.destroy();
    res.json({ message: "Winner deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
