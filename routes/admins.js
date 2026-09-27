const express = require("express");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== "superadmin")
    return res.status(403).json({ message: "Super admin access required" });
  next();
}

router.get("/", auth, requireSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const admin = await Admin.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: "admin",
    });

    res.status(201).json({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, requireSuperAdmin, async (req, res) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Admin not found" });
    if (target.role === "superadmin")
      return res.status(403).json({ message: "Cannot delete super admin" });

    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: "Admin deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
