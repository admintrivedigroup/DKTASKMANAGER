const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeRole, PRIVILEGED_ROLES } = require("../utils/roleUtils");
const { getJwtSecret } = require("../utils/jwtSecret");

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer")) {
      token = token.split(" ")[1]; // Extract token
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id).select("-password");
      
      if (req.user && typeof req.user.role === "string") {
        req.user.role = normalizeRole(req.user.role);
      }
      next();
    } else {
      res.status(401).json({ message: "Not authorized, no token" });
    }
  } catch (error) {
    res.status(401).json({ message: "Token failed", error: error.message });
  }
};

const adminOnly = (req, res, next) => {
  const normalizedRole = normalizeRole(req.user?.role);

  if (req.user && PRIVILEGED_ROLES.includes(normalizedRole)) {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied, admin or Super Admin only" });
  }
};
  
module.exports = { protect, adminOnly, PRIVILEGED_ROLES };