const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    status: {
      type: String,
      default: "unread",
      enum: ["unread", "read", "replied", "archived"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
