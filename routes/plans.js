const express = require("express");
const Plan = require("../models/Plan");
const auth = require("../middleware/auth");

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== "superadmin")
    return res.status(403).json({ message: "Super admin access required" });
  next();
}

router.get("/", auth, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, requireSuperAdmin, async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Plan slug already exists" });
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
