const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

const crypto = require("crypto");
const { sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/email");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const admin = await Admin.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: "admin",
    });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    sendWelcomeEmail(admin.email, admin.name).catch(() => {});

    res.status(201).json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", auth, (req, res) => {
  res.json(req.admin);
});

router.put("/settings", auth, async (req, res) => {
  try {
    const { githubToken, name } = req.body;
    const update = {};
    if (githubToken !== undefined) update.githubToken = githubToken;
    if (name) update.name = name;
    const admin = await Admin.findByIdAndUpdate(req.admin._id, update, {
      new: true,
    }).select("-password");
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    const admin = await Admin.findById(req.admin._id);
    if (!(await admin.comparePassword(currentPassword)))
      return res.status(401).json({ message: "Current password is incorrect" });
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/avatar", auth, express.raw({ type: ["image/png", "image/jpeg", "image/webp", "image/gif"], limit: "5mb" }), async (req, res) => {
  try {
    if (!req.body || !req.body.length)
      return res.status(400).json({ message: "No image data received" });
    const contentType = req.headers["content-type"];
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { avatar: { data: req.body, contentType } },
      { new: true }
    ).select("-password");
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/avatar/:id", async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("avatar");
    if (!admin?.avatar?.data) return res.status(404).json({ message: "No avatar" });
    res.set("Content-Type", admin.avatar.contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(admin.avatar.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/avatar", auth, async (req, res) => {
  try {
    await Admin.findByIdAndUpdate(req.admin._id, { $unset: { avatar: 1 } });
    res.json({ message: "Avatar removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.json({ message: "If that email exists, a reset link has been sent" });

    const token = crypto.randomBytes(32).toString("hex");
    admin.resetToken = crypto.createHash("sha256").update(token).digest("hex");
    admin.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await admin.save();

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${token}`;
    await sendPasswordResetEmail(admin.email, resetUrl);

    res.json({ message: "If that email exists, a reset link has been sent" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and password required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const admin = await Admin.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!admin) return res.status(400).json({ message: "Invalid or expired reset token" });

    admin.password = password;
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    await admin.save();

    res.json({ message: "Password has been reset" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
