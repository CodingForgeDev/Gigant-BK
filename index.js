require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Admin = require("./models/Admin");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/github", require("./routes/github"));
app.use("/api/admins", require("./routes/admins"));
app.use("/api/overview", require("./routes/overview"));
app.use("/api/roadmap", require("./routes/roadmap"));
app.use("/api/plans", require("./routes/plans"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/integrations", require("./routes/integrations"));
app.use("/api/organizations", require("./routes/organizations"));

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

connectDB()
  .then(seedAdmin)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
