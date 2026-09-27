const express = require("express");
const Integration = require("../models/Integration");
const auth = require("../middleware/auth");

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== "superadmin")
    return res.status(403).json({ message: "Super admin access required" });
  next();
}

router.get("/", auth, async (req, res) => {
  try {
    const integrations = await Integration.find().sort({ category: 1, name: 1 });
    res.json(integrations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, requireSuperAdmin, async (req, res) => {
  try {
    const integration = await Integration.create(req.body);
    res.status(201).json(integration);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Integration slug already exists" });
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    const integration = await Integration.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!integration) return res.status(404).json({ message: "Integration not found" });
    res.json(integration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/toggle", auth, requireSuperAdmin, async (req, res) => {
  try {
    const integration = await Integration.findById(req.params.id);
    if (!integration) return res.status(404).json({ message: "Integration not found" });
    integration.isConnected = !integration.isConnected;
    await integration.save();
    res.json(integration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    await Integration.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
