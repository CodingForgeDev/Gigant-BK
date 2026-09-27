const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    price: { type: Number, default: 0 },
    interval: { type: String, default: "month", enum: ["month", "year", "one_time"] },
    storageLimit: { type: String, default: "1GB" },
    repoLimit: { type: Number, default: 5 },
    collaboratorLimit: { type: Number, default: 10 },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
