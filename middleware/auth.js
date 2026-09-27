const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id).select("-password");
    if (!req.admin) return res.status(401).json({ message: "Admin not found" });
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = auth;
