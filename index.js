require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const Admin = require("./models/Admin");

const app = express();
app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === "/api/billing/webhook") return next();
  express.json()(req, res, next);
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many messages, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/messages", contactLimiter);
app.use("/api/github", apiLimiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/github", require("./routes/github"));
app.use("/api/admins", require("./routes/admins"));
app.use("/api/overview", require("./routes/overview"));
app.use("/api/roadmap", require("./routes/roadmap"));
app.use("/api/plans", require("./routes/plans"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/integrations", require("./routes/integrations"));
app.use("/api/organizations", require("./routes/organizations"));
app.use("/api/billing", require("./routes/billing"));

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  const count = await Admin.countDocuments();
  if (count === 0 && process.env.SUPER_ADMIN_EMAIL) {
    await Admin.create({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD || "admin123",
      name: "Super Admin",
      role: "superadmin",
      githubToken: process.env.GITHUB_TOKEN,
    });
    console.log("Super admin seeded");
  }
};

if (require.main === module) {
  connectDB()
    .then(seedAdmin)
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error("Failed to start:", err);
      process.exit(1);
    });
}

module.exports = { app, connectDB, seedAdmin };
