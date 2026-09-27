const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing", "incomplete"],
      default: "active",
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
