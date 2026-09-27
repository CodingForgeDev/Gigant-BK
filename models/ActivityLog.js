const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["remove_collaborator", "list_collaborators", "search"],
    },
    details: { type: String },
    targetUser: { type: String },
    targetRepos: [{ type: String }],
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
