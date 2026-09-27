const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    members: [
      {
        admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        role: { type: String, enum: ["owner", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    githubToken: { type: String },
    settings: {
      maxRepos: { type: Number, default: 10 },
      maxCollaborators: { type: Number, default: 50 },
      notificationsEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
