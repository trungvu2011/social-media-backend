import User from "../models/user.model.js";

export const checkBanned = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.isBanned) {
      return res.status(403).json({ 
        message: "Your account has been banned",
        reason: user.banReason,
        bannedAt: user.bannedAt
      });
    }
    
    next();
  } catch (error) {
    console.error("Check banned error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
