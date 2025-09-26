import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Batch from "../models/Batch.js";

export const authMiddleware = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user without sensitive fields and populate batch
      const user = await User.findById(decoded.id)
        .select("-password -refreshToken -resetPasswordToken -resetPasswordExpire")
        .populate({
          path: "batch",
          model: Batch,
          select: "name totalSem year course status",
        });

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// -------------------- Role-based Authorization --------------------
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied." });
    }
    next();
  };
};
