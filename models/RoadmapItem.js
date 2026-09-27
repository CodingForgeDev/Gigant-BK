const mongoose = require("mongoose");

const roadmapItemSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      default: "backlog",
      enum: ["backlog", "todo", "in_progress", "review", "done"],
    },
    priority: {
      type: String,
      default: "medium",
      enum: ["low", "medium", "high", "critical"],
    },
    assignee: { type: String, default: "" },
    phase: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoadmapItem", roadmapItemSchema);
