const express = require("express");
const Message = require("../models/Message");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");
const { sendContactNotification } = require("../utils/email");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, subject, body } = req.body;
    if (!name || !email || !body)
      return res.status(400).json({ message: "name, email, and body are required" });
    const message = await Message.create({ name, email, subject, body });

    Admin.findOne({ role: "superadmin" }).then((sa) => {
      if (sa) sendContactNotification(sa.email, { name, email, subject, body }).catch(() => {});
    });

    res.status(201).json({ message: "Message sent", id: message._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [messages, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Message.countDocuments(filter),
    ]);

    res.json({ messages, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
