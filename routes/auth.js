const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

const router = express.Router();

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
      admin: { id: admin._id, email: admin.email, name: admin.name },
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

module.exports = router;
