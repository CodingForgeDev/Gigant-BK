const express = require("express");
const Admin = require("../models/Admin");
const ActivityLog = require("../models/ActivityLog");
const Message = require("../models/Message");
const RoadmapItem = require("../models/RoadmapItem");
const Plan = require("../models/Plan");
const Integration = require("../models/Integration");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const [
      totalAdmins,
      totalMessages,
      unreadMessages,
      totalActions,
      roadmapDone,
      roadmapTotal,
      activePlans,
      connectedIntegrations,
    ] = await Promise.all([
      Admin.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ status: "unread" }),
      ActivityLog.countDocuments(),
      RoadmapItem.countDocuments({ status: "done" }),
      RoadmapItem.countDocuments(),
      Plan.countDocuments({ isActive: true }),
      Integration.countDocuments({ isConnected: true }),
    ]);

    const recentActivity = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("performedBy", "name email");

    res.json({
      admins: totalAdmins,
      messages: { total: totalMessages, unread: unreadMessages },
      actions: totalActions,
      roadmap: { done: roadmapDone, total: roadmapTotal },
      plans: activePlans,
      integrations: connectedIntegrations,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
