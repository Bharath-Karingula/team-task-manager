import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_access_secret");
    const user = await User.findById(decoded.id).select("-password -refreshTokens.tokenHash");

    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Session expired. Please login again." });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to perform this action." });
  }

  next();
};
