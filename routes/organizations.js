const express = require("express");
const Organization = require("../models/Organization");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const orgs = await Organization.find({
      $or: [{ owner: req.admin._id }, { "members.admin": req.admin._id }],
    })
      .populate("owner", "name email")
      .populate("plan", "name slug")
      .sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ message: "Name and slug required" });

    const existing = await Organization.findOne({ slug: slug.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Slug already taken" });

    const org = await Organization.create({
      name,
      slug: slug.toLowerCase(),
      owner: req.admin._id,
      members: [{ admin: req.admin._id, role: "owner" }],
    });
    res.status(201).json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.admin", "name email")
      .populate("plan", "name slug price interval");
    if (!org) return res.status(404).json({ message: "Organization not found" });
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.owner.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Only the owner can update" });

    const { name, settings, githubToken } = req.body;
    if (name) org.name = name;
    if (settings) Object.assign(org.settings, settings);
    if (githubToken !== undefined) org.githubToken = githubToken;
    await org.save();
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/members", auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.owner.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Only the owner can add members" });

    const { adminId } = req.body;
    if (org.members.some((m) => m.admin.toString() === adminId))
      return res.status(409).json({ message: "Already a member" });

    org.members.push({ admin: adminId, role: "member" });
    await org.save();
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id/members/:adminId", auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.owner.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Only the owner can remove members" });
    if (org.owner.toString() === req.params.adminId)
      return res.status(400).json({ message: "Cannot remove the owner" });

    org.members = org.members.filter((m) => m.admin.toString() !== req.params.adminId);
    await org.save();
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.owner.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Only the owner can delete" });

    await Organization.findByIdAndDelete(req.params.id);
    res.json({ message: "Organization deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
