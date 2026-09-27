const express = require("express");
const RoadmapItem = require("../models/RoadmapItem");
const auth = require("../middleware/auth");

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== "superadmin")
    return res.status(403).json({ message: "Super admin access required" });
  next();
}

router.get("/", auth, async (req, res) => {
  try {
    const items = await RoadmapItem.find().sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, requireSuperAdmin, async (req, res) => {
  try {
    const { ticketNumber, title, description, status, priority, assignee, phase, order } = req.body;
    if (!ticketNumber || !title)
      return res.status(400).json({ message: "ticketNumber and title are required" });
    const item = await RoadmapItem.create({
      ticketNumber, title, description, status, priority, assignee, phase, order,
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Ticket number already exists" });
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    const item = await RoadmapItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    const item = await RoadmapItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
