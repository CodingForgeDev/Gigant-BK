const mongoose = require("mongoose");

const integrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      default: "other",
      enum: ["payment", "email", "cache", "messaging", "analytics", "other"],
    },
    isConnected: { type: Boolean, default: false },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    icon: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Integration", integrationSchema);
